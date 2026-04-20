import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { ApprovalInstance } from "../../entities/approval-instance.entity";
import { AuditEvent } from "../../entities/audit-event.entity";
import { InventoryLot, type InventoryLotStatus } from "../../entities/inventory-lot.entity";
import { Medicine } from "../../entities/medicine.entity";
import { SaleLine } from "../../entities/sale-line.entity";
import { TransferLine } from "../../entities/transfer-line.entity";
import { UserRole } from "../../entities/user-membership.entity";
import { AuditEventsService } from "../audit-events/audit-events.service";
import type { AuthContext } from "../tenancy/auth-context";
import { HQ_ROLES } from "../tenancy/role-utils";
import { isLotExpired } from "./lot-expiry";
import { canTransitionLotStatus } from "./lot-status";

type LotSummary = {
  id: string;
  medicineId: string;
  medicineName: string;
  lotCode: string;
  expiryDate: string;
  unitCost: string;
  status: InventoryLotStatus;
  quantityOnHand: number;
  isExpired: boolean;
};

type ValuationLine = {
  medicineId: string;
  medicineName: string;
  quantityOnHand: number;
  totalValue: string;
};

type ReportQuery = {
  branchId?: string;
  startDate?: string;
  endDate?: string;
};

type ExceptionReportItem = {
  id: string;
  eventType: "allocation_override" | "break_glass" | "quarantine";
  source: "sale" | "transfer" | "approval" | "audit";
  branchId: string | null;
  branchName: string | null;
  occurredAt: string;
  reason: string | null;
  details: Record<string, unknown>;
};

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryLot)
    private readonly lotRepo: Repository<InventoryLot>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(SaleLine)
    private readonly saleLineRepo: Repository<SaleLine>,
    @InjectRepository(TransferLine)
    private readonly transferLineRepo: Repository<TransferLine>,
    @InjectRepository(ApprovalInstance)
    private readonly approvalRepo: Repository<ApprovalInstance>,
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
    @Inject(AuditEventsService)
    private readonly auditEventsService: AuditEventsService,
  ) {}

  private getBranchScope(context: AuthContext) {
    if (!context.tenantId || !context.activeBranchId) {
      throw new NotFoundException("Active branch context required");
    }
    return { tenantId: context.tenantId, branchId: context.activeBranchId };
  }

  private getTenantScope(context: AuthContext) {
    if (!context.tenantId) {
      throw new NotFoundException("Tenant context required");
    }
    return { tenantId: context.tenantId };
  }

  private isHq(context: AuthContext): boolean {
    return context.roles.some((role) => HQ_ROLES.includes(role));
  }

  private resolveReportBranchId(context: AuthContext, requestedBranchId?: string): string | null {
    if (this.isHq(context)) {
      return requestedBranchId ?? null;
    }
    if (!context.roles.includes(UserRole.BRANCH_MANAGER)) {
      throw new ForbiddenException("Report access requires HQ or branch manager role");
    }
    const activeBranchId = context.activeBranchId;
    if (!activeBranchId || !context.branchIds.includes(activeBranchId)) {
      throw new ForbiddenException("Active branch is required for branch-manager report access");
    }
    if (requestedBranchId && requestedBranchId !== activeBranchId) {
      throw new ForbiddenException(
        "Branch managers can only access reports for their active branch",
      );
    }
    return activeBranchId;
  }

  async listLots(
    context: AuthContext,
    options: { medicineId?: string },
  ): Promise<{ items: LotSummary[]; total: number }> {
    const scope = this.getBranchScope(context);
    if (options.medicineId) {
      const exists = await this.medicineRepo.exists({
        where: { id: options.medicineId, tenantId: scope.tenantId },
      });
      if (!exists) {
        throw new NotFoundException(`Medicine ${options.medicineId} not found`);
      }
    }
    const qb = this.lotRepo
      .createQueryBuilder("lot")
      .leftJoinAndSelect("lot.medicine", "medicine")
      .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("lot.branchId = :branchId", { branchId: scope.branchId });
    if (options.medicineId) {
      qb.andWhere("lot.medicineId = :medicineId", { medicineId: options.medicineId });
    }
    qb.orderBy("lot.expiryDate", "ASC").addOrderBy("lot.lotCode", "ASC");
    const lots = await qb.getMany();
    const items = lots.map((lot) => ({
      id: lot.id,
      medicineId: lot.medicineId,
      medicineName: lot.medicine?.name ?? "Unknown",
      lotCode: lot.lotCode,
      expiryDate: lot.expiryDate,
      unitCost: lot.unitCost,
      status: lot.status,
      quantityOnHand: lot.quantityOnHand,
      isExpired: isLotExpired(lot.expiryDate),
    }));
    return { items, total: items.length };
  }

  async updateLotStatus(
    context: AuthContext,
    lotId: string,
    payload: { status: InventoryLotStatus; reason?: string | null },
  ): Promise<LotSummary> {
    const scope = this.getBranchScope(context);
    if (!context.userId) {
      throw new UnauthorizedException("User context is required to update lot status");
    }
    const lot = await this.lotRepo.findOne({
      where: { id: lotId, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { medicine: true },
    });
    if (!lot) {
      throw new NotFoundException(`Lot ${lotId} not found`);
    }
    const nextStatus = payload.status;
    if (!canTransitionLotStatus(lot.status, nextStatus)) {
      throw new BadRequestException("Recalled lots cannot be reactivated");
    }
    const previousStatus = lot.status;
    lot.status = nextStatus;
    const saved = await this.lotRepo.save(lot);
    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: context.userId,
      action: "inventory.lot.status_updated",
      entityType: "inventory_lot",
      entityId: saved.id,
      metadata: {
        previousStatus,
        nextStatus,
        reason: payload.reason ?? null,
        medicineId: saved.medicineId,
        lotCode: saved.lotCode,
      },
    });
    return {
      id: saved.id,
      medicineId: saved.medicineId,
      medicineName: saved.medicine?.name ?? "Unknown",
      lotCode: saved.lotCode,
      expiryDate: saved.expiryDate,
      unitCost: saved.unitCost,
      status: saved.status,
      quantityOnHand: saved.quantityOnHand,
      isExpired: isLotExpired(saved.expiryDate),
    };
  }

  async getBranchValuation(context: AuthContext): Promise<{
    totalValue: string;
    lines: ValuationLine[];
  }> {
    const scope = this.getBranchScope(context);
    const rows = await this.lotRepo
      .createQueryBuilder("lot")
      .innerJoin("lot.medicine", "medicine")
      .select("lot.medicineId", "medicineId")
      .addSelect("medicine.name", "medicineName")
      .addSelect("SUM(lot.quantityOnHand)", "quantityOnHand")
      .addSelect("SUM(lot.quantityOnHand * lot.unitCost)", "totalValue")
      .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("lot.branchId = :branchId", { branchId: scope.branchId })
      .groupBy("lot.medicineId")
      .addGroupBy("medicine.name")
      .orderBy("medicine.name", "ASC")
      .getRawMany();

    const lines: ValuationLine[] = rows.map((row) => ({
      medicineId: row.medicineId,
      medicineName: row.medicineName,
      quantityOnHand: Number(row.quantityOnHand ?? 0),
      totalValue: row.totalValue ?? "0",
    }));

    const totalValue = sumDecimalStrings(lines.map((line) => line.totalValue));
    return { totalValue, lines };
  }

  async getExpiryHorizonReport(
    context: AuthContext,
    query: ReportQuery,
  ): Promise<{
    items: {
      lotId: string;
      branchId: string;
      branchName: string;
      medicineId: string;
      medicineName: string;
      lotCode: string;
      expiryDate: string;
      daysToExpiry: number;
      quantityOnHand: number;
      unitCost: string;
      status: InventoryLotStatus;
    }[];
    total: number;
    filters: { branchId: string | null; startDate: string | null; endDate: string | null };
    limits: { maxDateWindowDays: number; defaultExpiryHorizonDays: number };
  }> {
    const scope = this.getTenantScope(context);
    const branchId = this.resolveReportBranchId(context, query.branchId);
    const window = normalizeReportDateWindow(query, {
      defaultStartToToday: true,
      defaultEndDays: DEFAULT_EXPIRY_HORIZON_DAYS,
    });

    const qb = this.lotRepo
      .createQueryBuilder("lot")
      .innerJoin("lot.medicine", "medicine")
      .innerJoin("lot.branch", "branch")
      .select("lot.id", "lotId")
      .addSelect("lot.branchId", "branchId")
      .addSelect("branch.name", "branchName")
      .addSelect("lot.medicineId", "medicineId")
      .addSelect("medicine.name", "medicineName")
      .addSelect("lot.lotCode", "lotCode")
      .addSelect("lot.expiryDate", "expiryDate")
      .addSelect("lot.quantityOnHand", "quantityOnHand")
      .addSelect("lot.unitCost", "unitCost")
      .addSelect("lot.status", "status")
      .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("lot.quantityOnHand > 0");

    if (branchId) {
      qb.andWhere("lot.branchId = :branchId", { branchId });
    }
    if (window.startDateOnly) {
      qb.andWhere("lot.expiryDate >= :startDateOnly", { startDateOnly: window.startDateOnly });
    }
    if (window.endDateOnly) {
      qb.andWhere("lot.expiryDate <= :endDateOnly", { endDateOnly: window.endDateOnly });
    }

    const rows = await qb
      .orderBy("lot.expiryDate", "ASC")
      .addOrderBy("branch.name", "ASC")
      .addOrderBy("medicine.name", "ASC")
      .getRawMany();

    const items = rows.map((row) => ({
      lotId: row.lotId,
      branchId: row.branchId,
      branchName: row.branchName,
      medicineId: row.medicineId,
      medicineName: row.medicineName,
      lotCode: row.lotCode,
      expiryDate: row.expiryDate,
      daysToExpiry: computeDaysUntilDate(row.expiryDate),
      quantityOnHand: Number(row.quantityOnHand ?? 0),
      unitCost: row.unitCost,
      status: row.status as InventoryLotStatus,
    }));

    return {
      items,
      total: items.length,
      filters: {
        branchId,
        startDate: window.startDateOnly,
        endDate: window.endDateOnly,
      },
      limits: {
        maxDateWindowDays: REPORT_MAX_DATE_WINDOW_DAYS,
        defaultExpiryHorizonDays: DEFAULT_EXPIRY_HORIZON_DAYS,
      },
    };
  }

  async getStockValuationReport(
    context: AuthContext,
    query: ReportQuery,
  ): Promise<{
    items: {
      branchId: string;
      branchName: string;
      quantityOnHand: number;
      totalValue: string;
    }[];
    total: number;
    totalValue: string;
    filters: { branchId: string | null; startDate: string | null; endDate: string | null };
    limits: { maxDateWindowDays: number };
  }> {
    const scope = this.getTenantScope(context);
    const branchId = this.resolveReportBranchId(context, query.branchId);
    const window = normalizeReportDateWindow(query);

    const qb = this.lotRepo
      .createQueryBuilder("lot")
      .innerJoin("lot.branch", "branch")
      .select("lot.branchId", "branchId")
      .addSelect("branch.name", "branchName")
      .addSelect("SUM(lot.quantityOnHand)", "quantityOnHand")
      .addSelect("SUM(lot.quantityOnHand * lot.unitCost)", "totalValue")
      .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("lot.quantityOnHand > 0");

    if (branchId) {
      qb.andWhere("lot.branchId = :branchId", { branchId });
    }
    if (window.startDateOnly) {
      qb.andWhere("lot.expiryDate >= :startDateOnly", { startDateOnly: window.startDateOnly });
    }
    if (window.endDateOnly) {
      qb.andWhere("lot.expiryDate <= :endDateOnly", { endDateOnly: window.endDateOnly });
    }

    const rows = await qb
      .groupBy("lot.branchId")
      .addGroupBy("branch.name")
      .orderBy("branch.name", "ASC")
      .getRawMany();

    const items = rows.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      quantityOnHand: Number(row.quantityOnHand ?? 0),
      totalValue: row.totalValue ?? "0",
    }));

    return {
      items,
      total: items.length,
      totalValue: sumDecimalStrings(items.map((item) => item.totalValue)),
      filters: {
        branchId,
        startDate: window.startDateOnly,
        endDate: window.endDateOnly,
      },
      limits: {
        maxDateWindowDays: REPORT_MAX_DATE_WINDOW_DAYS,
      },
    };
  }

  async getExceptionsReport(
    context: AuthContext,
    query: ReportQuery,
  ): Promise<{
    items: ExceptionReportItem[];
    total: number;
    filters: { branchId: string | null; startDate: string | null; endDate: string | null };
    limits: { maxDateWindowDays: number; maxRows: number };
  }> {
    const scope = this.getTenantScope(context);
    const branchId = this.resolveReportBranchId(context, query.branchId);
    const window = normalizeReportDateWindow(query);

    const saleOverrideRows = await this.saleLineRepo
      .createQueryBuilder("line")
      .innerJoin("line.sale", "sale")
      .innerJoin("sale.branch", "branch")
      .innerJoin("line.medicine", "medicine")
      .select("line.id", "id")
      .addSelect("sale.branchId", "branchId")
      .addSelect("branch.name", "branchName")
      .addSelect("line.createdAt", "occurredAt")
      .addSelect("line.overrideReason", "reason")
      .addSelect("sale.id", "saleId")
      .addSelect("medicine.id", "medicineId")
      .addSelect("medicine.name", "medicineName")
      .where("sale.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("line.overrideReason IS NOT NULL")
      .andWhere("BTRIM(line.overrideReason) <> ''");

    if (branchId) {
      saleOverrideRows.andWhere("sale.branchId = :branchId", { branchId });
    }
    if (window.startDateTime) {
      saleOverrideRows.andWhere("line.createdAt >= :startDateTime", {
        startDateTime: window.startDateTime,
      });
    }
    if (window.endDateTimeExclusive) {
      saleOverrideRows.andWhere("line.createdAt < :endDateTimeExclusive", {
        endDateTimeExclusive: window.endDateTimeExclusive,
      });
    }

    const saleOverrides = await saleOverrideRows
      .orderBy("line.createdAt", "DESC")
      .take(REPORT_MAX_ROWS)
      .getRawMany();

    const transferOverrideRows = await this.transferLineRepo
      .createQueryBuilder("line")
      .innerJoin("line.transfer", "transfer")
      .innerJoin("transfer.sourceBranch", "branch")
      .innerJoin("line.medicine", "medicine")
      .select("line.id", "id")
      .addSelect("transfer.sourceBranchId", "branchId")
      .addSelect("branch.name", "branchName")
      .addSelect("line.createdAt", "occurredAt")
      .addSelect("line.overrideReason", "reason")
      .addSelect("transfer.id", "transferId")
      .addSelect("medicine.id", "medicineId")
      .addSelect("medicine.name", "medicineName")
      .where("transfer.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("line.overrideReason IS NOT NULL")
      .andWhere("BTRIM(line.overrideReason) <> ''");

    if (branchId) {
      transferOverrideRows.andWhere("transfer.sourceBranchId = :branchId", { branchId });
    }
    if (window.startDateTime) {
      transferOverrideRows.andWhere("line.createdAt >= :startDateTime", {
        startDateTime: window.startDateTime,
      });
    }
    if (window.endDateTimeExclusive) {
      transferOverrideRows.andWhere("line.createdAt < :endDateTimeExclusive", {
        endDateTimeExclusive: window.endDateTimeExclusive,
      });
    }

    const transferOverrides = await transferOverrideRows
      .orderBy("line.createdAt", "DESC")
      .take(REPORT_MAX_ROWS)
      .getRawMany();

    const breakGlassRows = await this.approvalRepo
      .createQueryBuilder("approval")
      .leftJoin("approval.branch", "branch")
      .select("approval.id", "id")
      .addSelect("approval.branchId", "branchId")
      .addSelect("branch.name", "branchName")
      .addSelect("approval.createdAt", "occurredAt")
      .addSelect("approval.breakGlassReason", "reason")
      .addSelect("approval.breakGlassExpiresAt", "breakGlassExpiresAt")
      .addSelect("approval.domainType", "domainType")
      .addSelect("approval.domainId", "domainId")
      .where("approval.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("approval.breakGlassReason IS NOT NULL")
      .andWhere("BTRIM(approval.breakGlassReason) <> ''");

    if (branchId) {
      breakGlassRows.andWhere("approval.branchId = :branchId", { branchId });
    }
    if (window.startDateTime) {
      breakGlassRows.andWhere("approval.createdAt >= :startDateTime", {
        startDateTime: window.startDateTime,
      });
    }
    if (window.endDateTimeExclusive) {
      breakGlassRows.andWhere("approval.createdAt < :endDateTimeExclusive", {
        endDateTimeExclusive: window.endDateTimeExclusive,
      });
    }

    const breakGlassEvents = await breakGlassRows
      .orderBy("approval.createdAt", "DESC")
      .take(REPORT_MAX_ROWS)
      .getRawMany();

    const quarantineRows = await this.auditRepo
      .createQueryBuilder("audit")
      .leftJoin(InventoryLot, "lot", "lot.id = audit.entityId AND lot.tenantId = audit.tenantId")
      .leftJoin("lot.branch", "branch")
      .select("audit.id", "id")
      .addSelect("lot.branchId", "branchId")
      .addSelect("branch.name", "branchName")
      .addSelect("audit.createdAt", "occurredAt")
      .addSelect("audit.metadata ->> 'reason'", "reason")
      .addSelect("audit.entityId", "lotId")
      .addSelect("lot.lotCode", "lotCode")
      .addSelect("lot.medicineId", "medicineId")
      .where("audit.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("audit.action = :action", { action: "inventory.lot.status_updated" })
      .andWhere("audit.entityType = :entityType", { entityType: "inventory_lot" })
      .andWhere("audit.metadata ->> 'nextStatus' = :nextStatus", { nextStatus: "QUARANTINE" });

    if (branchId) {
      quarantineRows.andWhere("lot.branchId = :branchId", { branchId });
    }
    if (window.startDateTime) {
      quarantineRows.andWhere("audit.createdAt >= :startDateTime", {
        startDateTime: window.startDateTime,
      });
    }
    if (window.endDateTimeExclusive) {
      quarantineRows.andWhere("audit.createdAt < :endDateTimeExclusive", {
        endDateTimeExclusive: window.endDateTimeExclusive,
      });
    }

    const quarantineEvents = await quarantineRows
      .orderBy("audit.createdAt", "DESC")
      .take(REPORT_MAX_ROWS)
      .getRawMany();

    const items: ExceptionReportItem[] = [
      ...saleOverrides.map((row) => ({
        id: row.id,
        eventType: "allocation_override" as const,
        source: "sale" as const,
        branchId: row.branchId,
        branchName: row.branchName,
        occurredAt: toIsoString(row.occurredAt),
        reason: row.reason ?? null,
        details: {
          saleId: row.saleId,
          medicineId: row.medicineId,
          medicineName: row.medicineName,
        },
      })),
      ...transferOverrides.map((row) => ({
        id: row.id,
        eventType: "allocation_override" as const,
        source: "transfer" as const,
        branchId: row.branchId,
        branchName: row.branchName,
        occurredAt: toIsoString(row.occurredAt),
        reason: row.reason ?? null,
        details: {
          transferId: row.transferId,
          medicineId: row.medicineId,
          medicineName: row.medicineName,
        },
      })),
      ...breakGlassEvents.map((row) => ({
        id: row.id,
        eventType: "break_glass" as const,
        source: "approval" as const,
        branchId: row.branchId,
        branchName: row.branchName ?? null,
        occurredAt: toIsoString(row.occurredAt),
        reason: row.reason ?? null,
        details: {
          breakGlassExpiresAt: row.breakGlassExpiresAt
            ? toIsoString(row.breakGlassExpiresAt)
            : null,
          domainType: row.domainType,
          domainId: row.domainId,
        },
      })),
      ...quarantineEvents.map((row) => ({
        id: row.id,
        eventType: "quarantine" as const,
        source: "audit" as const,
        branchId: row.branchId ?? null,
        branchName: row.branchName ?? null,
        occurredAt: toIsoString(row.occurredAt),
        reason: row.reason ?? null,
        details: {
          lotId: row.lotId,
          lotCode: row.lotCode ?? null,
          medicineId: row.medicineId ?? null,
        },
      })),
    ]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, REPORT_MAX_ROWS);

    return {
      items,
      total: items.length,
      filters: {
        branchId,
        startDate: window.startDateInput,
        endDate: window.endDateInput,
      },
      limits: {
        maxDateWindowDays: REPORT_MAX_DATE_WINDOW_DAYS,
        maxRows: REPORT_MAX_ROWS,
      },
    };
  }

  async getOrgOnHand(context: AuthContext): Promise<{
    items: {
      branchId: string;
      branchName: string;
      medicineId: string;
      medicineName: string;
      quantityOnHand: number;
    }[];
    total: number;
  }> {
    if (!context.tenantId) {
      throw new NotFoundException("Tenant context required");
    }
    const rows = await this.lotRepo
      .createQueryBuilder("lot")
      .innerJoin("lot.medicine", "medicine")
      .innerJoin("lot.branch", "branch")
      .select("lot.branchId", "branchId")
      .addSelect("branch.name", "branchName")
      .addSelect("lot.medicineId", "medicineId")
      .addSelect("medicine.name", "medicineName")
      .addSelect("SUM(lot.quantityOnHand)", "quantityOnHand")
      .where("lot.tenantId = :tenantId", { tenantId: context.tenantId })
      .groupBy("lot.branchId")
      .addGroupBy("branch.name")
      .addGroupBy("lot.medicineId")
      .addGroupBy("medicine.name")
      .orderBy("branch.name", "ASC")
      .addOrderBy("medicine.name", "ASC")
      .getRawMany();

    const items = rows.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      medicineId: row.medicineId,
      medicineName: row.medicineName,
      quantityOnHand: Number(row.quantityOnHand ?? 0),
    }));
    return { items, total: items.length };
  }
}

const REPORT_MAX_DATE_WINDOW_DAYS = 365;
const DEFAULT_EXPIRY_HORIZON_DAYS = 90;
const REPORT_MAX_ROWS = 500;

type ReportDateWindow = {
  startDateTime: Date | null;
  endDateTimeExclusive: Date | null;
  startDateOnly: string | null;
  endDateOnly: string | null;
  startDateInput: string | null;
  endDateInput: string | null;
};

export const normalizeReportDateWindow = (
  query: ReportQuery,
  options?: { defaultStartToToday?: boolean; defaultEndDays?: number },
): ReportDateWindow => {
  const startDateInput = query.startDate?.trim() || null;
  const endDateInput = query.endDate?.trim() || null;

  const startDateTime = startDateInput ? parseReportDate(startDateInput, "startDate") : null;
  const endDateTime = endDateInput ? parseReportDate(endDateInput, "endDate") : null;

  let resolvedStart = startDateTime;
  let resolvedEnd = endDateTime;
  if (!resolvedStart && options?.defaultStartToToday) {
    resolvedStart = startOfUtcDay(new Date());
  }
  if (!resolvedEnd && options?.defaultEndDays) {
    const anchor = resolvedStart ?? startOfUtcDay(new Date());
    resolvedEnd = addDays(anchor, options.defaultEndDays);
  }

  if (resolvedStart && resolvedEnd && resolvedStart > resolvedEnd) {
    throw new BadRequestException("startDate must be before or equal to endDate");
  }
  if (resolvedStart && resolvedEnd) {
    const rangeMs = resolvedEnd.getTime() - resolvedStart.getTime();
    const maxRangeMs = REPORT_MAX_DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (rangeMs > maxRangeMs) {
      throw new BadRequestException(
        `Date window cannot exceed ${REPORT_MAX_DATE_WINDOW_DAYS} days for report performance`,
      );
    }
  }

  return {
    startDateTime: resolvedStart,
    endDateTimeExclusive: resolvedEnd ? addDays(startOfUtcDay(resolvedEnd), 1) : null,
    startDateOnly: resolvedStart ? toDateOnlyString(resolvedStart) : null,
    endDateOnly: resolvedEnd ? toDateOnlyString(resolvedEnd) : null,
    startDateInput,
    endDateInput,
  };
};

export const computeDaysUntilDate = (dateOnlyValue: string): number => {
  const today = startOfUtcDay(new Date());
  const target = parseDateOnly(dateOnlyValue);
  const diffMs = target.getTime() - today.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
};

const parseDateOnly = (value: string): Date => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid date value: ${value}`);
  }
  return date;
};

const parseReportDate = (rawValue: string, fieldName: "startDate" | "endDate"): Date => {
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid ISO date string`);
  }
  return parsed;
};

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toDateOnlyString = (date: Date): string => date.toISOString().slice(0, 10);
const toIsoString = (value: Date | string): string => new Date(value).toISOString();

const sumDecimalStrings = (values: string[], scale = 4): string => {
  // Convert decimal strings to fixed-point integers (scale = number of decimal places).
  const factor = BigInt(10 ** scale);
  const total = values.reduce((acc, raw) => {
    if (!raw) return acc;
    const [intPart, fracPart = ""] = String(raw).split(".");
    const normalizedFrac = fracPart.padEnd(scale, "0").slice(0, scale);
    // Track sign separately to avoid issues with negative fixed-point math.
    const signed = intPart.startsWith("-") ? -1n : 1n;
    const absInt = intPart.replace("-", "") || "0";
    const scaled = BigInt(absInt) * factor + BigInt(normalizedFrac || "0");
    return acc + signed * scaled;
  }, 0n);
  const isNegative = total < 0n;
  const absTotal = isNegative ? -total : total;
  const intPart = absTotal / factor;
  const fracPart = String(absTotal % factor).padStart(scale, "0");
  return `${isNegative ? "-" : ""}${intPart.toString()}.${fracPart}`;
};
