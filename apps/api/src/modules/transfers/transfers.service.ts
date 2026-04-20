import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";
import { Branch } from "../../entities/branch.entity";
import { InventoryLot, InventoryLotStatus } from "../../entities/inventory-lot.entity";
import { MedicineOverlay } from "../../entities/medicine-overlay.entity";
import { Medicine } from "../../entities/medicine.entity";
import { TransferLineAllocation } from "../../entities/transfer-line-allocation.entity";
import { TransferLine } from "../../entities/transfer-line.entity";
import { Transfer, TransferStatus } from "../../entities/transfer.entity";
import { UserRole } from "../../entities/user-membership.entity";
import { AuditEventsService } from "../audit-events/audit-events.service";
import { saveLotWithRetry, saveOverlayWithRetry } from "../inventory/lot-update";
import type { AuthContext } from "../tenancy/auth-context";
import type { CreateTransferDto, ReceiveTransferDto, ShipTransferDto } from "./dto/transfer.dto";
import {
  applyTransferReceiptAdjustments,
  buildFefoAllocations,
  buildOverrideAllocations,
} from "./transfer-helpers";

const OVERRIDE_ROLES = new Set<UserRole>([
  UserRole.BRANCH_MANAGER,
  UserRole.HQ_ADMIN,
  UserRole.HQ_USER,
  UserRole.PLATFORM_ADMIN,
]);

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(Transfer)
    private readonly transferRepo: Repository<Transfer>,
    @InjectRepository(TransferLine)
    private readonly lineRepo: Repository<TransferLine>,
    @InjectRepository(TransferLineAllocation)
    private readonly allocationRepo: Repository<TransferLineAllocation>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(InventoryLot)
    private readonly lotRepo: Repository<InventoryLot>,
    @InjectRepository(MedicineOverlay)
    private readonly overlayRepo: Repository<MedicineOverlay>,
    @Inject(AuditEventsService)
    private readonly auditEventsService: AuditEventsService,
  ) {}

  private getBranchScope(context: AuthContext) {
    if (!context.tenantId || !context.activeBranchId) {
      throw new NotFoundException("Active branch context required");
    }
    return { tenantId: context.tenantId, branchId: context.activeBranchId };
  }

  private requireUser(context: AuthContext) {
    if (!context.userId) {
      throw new UnauthorizedException("User context is required");
    }
    return context.userId;
  }

  private ensureOverrideAuthorized(context: AuthContext) {
    if (!context.roles.some((role) => OVERRIDE_ROLES.has(role))) {
      throw new ForbiddenException("Lot override requires manager authorization");
    }
  }

  private async ensureBranch(tenantId: string, branchId: string) {
    const exists = await this.branchRepo.exists({ where: { id: branchId, tenantId } });
    if (!exists) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }
  }

  private async validateLines(tenantId: string, lines: CreateTransferDto["lines"]) {
    if (!lines.length) {
      throw new BadRequestException("At least one line is required");
    }
    const medicineIds = lines.map((line) => line.medicineId);
    const uniqueIds = new Set(medicineIds);
    if (uniqueIds.size !== medicineIds.length) {
      throw new BadRequestException("Transfer lines must use unique medicines");
    }
    const medicines = await this.medicineRepo.find({
      where: { id: In(medicineIds), tenantId },
      select: ["id"],
    });
    if (medicines.length !== uniqueIds.size) {
      throw new NotFoundException("One or more medicines not found");
    }
    return lines.map((line) => ({
      medicineId: line.medicineId,
      quantity: line.quantity,
    }));
  }

  private buildTransferResponse(transfer: Transfer) {
    return {
      id: transfer.id,
      tenantId: transfer.tenantId,
      sourceBranchId: transfer.sourceBranchId,
      destinationBranchId: transfer.destinationBranchId,
      status: transfer.status,
      notes: transfer.notes,
      createdBy: transfer.createdBy,
      shippedBy: transfer.shippedBy,
      receivedBy: transfer.receivedBy,
      shippedAt: transfer.shippedAt,
      receivedAt: transfer.receivedAt,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
      sourceBranch: transfer.sourceBranch
        ? {
            id: transfer.sourceBranch.id,
            tenantId: transfer.sourceBranch.tenantId,
            name: transfer.sourceBranch.name,
            code: transfer.sourceBranch.code,
            createdAt: transfer.sourceBranch.createdAt,
            updatedAt: transfer.sourceBranch.updatedAt,
          }
        : undefined,
      destinationBranch: transfer.destinationBranch
        ? {
            id: transfer.destinationBranch.id,
            tenantId: transfer.destinationBranch.tenantId,
            name: transfer.destinationBranch.name,
            code: transfer.destinationBranch.code,
            createdAt: transfer.destinationBranch.createdAt,
            updatedAt: transfer.destinationBranch.updatedAt,
          }
        : undefined,
      lines:
        transfer.lines?.map((line) => ({
          id: line.id,
          transferId: line.transferId,
          medicineId: line.medicineId,
          quantity: line.quantity,
          overrideReason: line.overrideReason,
          createdAt: line.createdAt,
          medicine: line.medicine
            ? {
                id: line.medicine.id,
                name: line.medicine.name,
                sku: line.medicine.sku,
                unit: line.medicine.unit,
              }
            : undefined,
          allocations:
            line.allocations?.map((allocation) => ({
              id: allocation.id,
              transferLineId: allocation.transferLineId,
              lotId: allocation.lotId,
              lotCode: allocation.lotCode,
              expiryDate: allocation.expiryDate,
              unitCost: allocation.unitCost,
              quantityShipped: allocation.quantityShipped,
              quantityReceived: allocation.quantityReceived,
              createdAt: allocation.createdAt,
            })) ?? [],
        })) ?? [],
    };
  }

  async list(context: AuthContext) {
    const scope = this.getBranchScope(context);
    const transfers = await this.transferRepo.find({
      where: [
        { tenantId: scope.tenantId, sourceBranchId: scope.branchId },
        { tenantId: scope.tenantId, destinationBranchId: scope.branchId },
      ],
      relations: { sourceBranch: true, destinationBranch: true, lines: true },
      order: { createdAt: "DESC" },
    });
    return {
      items: transfers.map((transfer) => this.buildTransferResponse(transfer)),
      total: transfers.length,
    };
  }

  async findOne(context: AuthContext, id: string) {
    const scope = this.getBranchScope(context);
    const transfer = await this.transferRepo.findOne({
      where: { id, tenantId: scope.tenantId },
      relations: {
        sourceBranch: true,
        destinationBranch: true,
        lines: { allocations: true, medicine: true },
      },
    });
    if (!transfer) {
      throw new NotFoundException(`Transfer ${id} not found`);
    }
    if (
      transfer.sourceBranchId !== scope.branchId &&
      transfer.destinationBranchId !== scope.branchId
    ) {
      throw new ForbiddenException("Not authorized to view this transfer");
    }
    return this.buildTransferResponse(transfer);
  }

  async create(context: AuthContext, dto: CreateTransferDto) {
    const scope = this.getBranchScope(context);
    const userId = this.requireUser(context);
    if (dto.destinationBranchId === scope.branchId) {
      throw new BadRequestException("Destination branch must differ from source");
    }
    await this.ensureBranch(scope.tenantId, dto.destinationBranchId);
    const linePayloads = await this.validateLines(scope.tenantId, dto.lines);

    const transfer = await this.transferRepo.manager.transaction(async (manager) => {
      const transferRepo = manager.getRepository(Transfer);
      const lineRepo = manager.getRepository(TransferLine);
      const transfer = transferRepo.create({
        tenantId: scope.tenantId,
        sourceBranchId: scope.branchId,
        destinationBranchId: dto.destinationBranchId,
        status: TransferStatus.DRAFT,
        notes: dto.notes?.trim() || null,
        createdBy: userId,
      });
      const saved = await transferRepo.save(transfer);
      const lines = linePayloads.map((line) => lineRepo.create({ ...line, transferId: saved.id }));
      await lineRepo.save(lines);
      return transferRepo.findOneOrFail({
        where: { id: saved.id },
        relations: { sourceBranch: true, destinationBranch: true, lines: { medicine: true } },
      });
    });

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: userId,
      action: "transfer.created",
      entityType: "transfer",
      entityId: transfer.id,
      metadata: {
        sourceBranchId: transfer.sourceBranchId,
        destinationBranchId: transfer.destinationBranchId,
      },
    });

    return this.buildTransferResponse(transfer);
  }

  async ship(context: AuthContext, id: string, dto: ShipTransferDto) {
    const scope = this.getBranchScope(context);
    const userId = this.requireUser(context);

    const overridesByLine = new Map(dto.lines?.map((line) => [line.transferLineId, line]));

    const transfer = await this.transferRepo.manager.transaction(async (manager) => {
      const transferRepo = manager.getRepository(Transfer);
      const lineRepo = manager.getRepository(TransferLine);
      const allocationRepo = manager.getRepository(TransferLineAllocation);
      const lotRepo = manager.getRepository(InventoryLot);

      const transfer = await transferRepo.findOne({
        where: { id, tenantId: scope.tenantId },
        relations: { lines: { allocations: true }, sourceBranch: true, destinationBranch: true },
        lock: { mode: "pessimistic_write" },
      });
      if (!transfer) {
        throw new NotFoundException(`Transfer ${id} not found`);
      }
      if (transfer.sourceBranchId !== scope.branchId) {
        throw new ForbiddenException("Only the source branch can ship this transfer");
      }
      if (transfer.status !== TransferStatus.DRAFT) {
        throw new BadRequestException("Only draft transfers can be shipped");
      }

      const lineIds = new Set(transfer.lines.map((line) => line.id));
      if (dto.lines) {
        for (const line of dto.lines) {
          if (!lineIds.has(line.transferLineId)) {
            throw new BadRequestException("Transfer line does not belong to this transfer");
          }
        }
      }

      const allocations: TransferLineAllocation[] = [];
      let overrideUsed = false;

      for (const line of transfer.lines) {
        const override = overridesByLine.get(line.id);
        const useOverride = (override?.allocations?.length ?? 0) > 0;
        if (useOverride) {
          const reason = override?.overrideReason?.trim() || "";
          if (!reason) {
            throw new BadRequestException("Override reason is required for manual allocations");
          }
          this.ensureOverrideAuthorized(context);
          overrideUsed = true;
          const lotIds = override?.allocations?.map((allocation) => allocation.lotId) ?? [];
          const lots = await lotRepo.find({
            where: {
              id: In(lotIds),
              tenantId: scope.tenantId,
              branchId: scope.branchId,
              medicineId: line.medicineId,
            },
            lock: { mode: "pessimistic_read" },
          });
          if (lots.length !== new Set(lotIds).size) {
            throw new NotFoundException("One or more override lots not found");
          }
          let overrideAllocations: ReturnType<typeof buildOverrideAllocations>;
          try {
            overrideAllocations = buildOverrideAllocations(
              line.quantity,
              override?.allocations ?? [],
              lots,
            );
          } catch (error) {
            throw new BadRequestException(
              error instanceof Error ? error.message : "Invalid override allocation",
            );
          }
          line.overrideReason = reason;
          for (const allocation of overrideAllocations) {
            allocations.push(
              allocationRepo.create({
                transferLineId: line.id,
                lotId: allocation.lotId,
                lotCode: allocation.lotCode,
                expiryDate: allocation.expiryDate,
                unitCost: allocation.unitCost,
                quantityShipped: allocation.quantity,
                quantityReceived: 0,
              }),
            );
          }
        } else {
          const lots = await lotRepo
            .createQueryBuilder("lot")
            .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
            .andWhere("lot.branchId = :branchId", { branchId: scope.branchId })
            .andWhere("lot.medicineId = :medicineId", { medicineId: line.medicineId })
            .andWhere("lot.quantityOnHand > 0")
            .andWhere("lot.status = :status", { status: InventoryLotStatus.ACTIVE })
            .orderBy("lot.expiryDate", "ASC")
            .addOrderBy("lot.createdAt", "ASC")
            .setLock("pessimistic_read")
            .getMany();
          let fefoAllocations: ReturnType<typeof buildFefoAllocations>;
          try {
            fefoAllocations = buildFefoAllocations(line.quantity, lots);
          } catch (error) {
            throw new ConflictException(
              error instanceof Error ? error.message : "Not enough stock for FEFO allocation",
            );
          }
          line.overrideReason = null;
          for (const allocation of fefoAllocations) {
            allocations.push(
              allocationRepo.create({
                transferLineId: line.id,
                lotId: allocation.lotId,
                lotCode: allocation.lotCode,
                expiryDate: allocation.expiryDate,
                unitCost: allocation.unitCost,
                quantityShipped: allocation.quantity,
                quantityReceived: 0,
              }),
            );
          }
        }
      }

      await allocationRepo.delete({ transferLineId: In([...lineIds]) });
      await lineRepo.save(transfer.lines);
      await allocationRepo.save(allocations);
      transfer.status = TransferStatus.IN_TRANSIT;
      transfer.shippedAt = new Date();
      transfer.shippedBy = userId;
      await transferRepo.save(transfer);

      const refreshed = await transferRepo.findOneOrFail({
        where: { id: transfer.id },
        relations: {
          sourceBranch: true,
          destinationBranch: true,
          lines: { allocations: true, medicine: true },
        },
      });

      return { transfer: refreshed, overrideUsed };
    });

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: userId,
      action: "transfer.shipped",
      entityType: "transfer",
      entityId: transfer.transfer.id,
      metadata: {
        sourceBranchId: transfer.transfer.sourceBranchId,
        destinationBranchId: transfer.transfer.destinationBranchId,
        overrideUsed: transfer.overrideUsed,
      },
    });

    return this.buildTransferResponse(transfer.transfer);
  }

  async receive(context: AuthContext, id: string, dto: ReceiveTransferDto) {
    const scope = this.getBranchScope(context);
    const userId = this.requireUser(context);

    const transfer = await this.transferRepo.manager.transaction(async (manager) => {
      const transferRepo = manager.getRepository(Transfer);
      const allocationRepo = manager.getRepository(TransferLineAllocation);
      const lotRepo = manager.getRepository(InventoryLot);
      const overlayRepo = manager.getRepository(MedicineOverlay);

      const transfer = await transferRepo.findOne({
        where: { id, tenantId: scope.tenantId },
        relations: {
          lines: { allocations: true },
          sourceBranch: true,
          destinationBranch: true,
        },
        lock: { mode: "pessimistic_write" },
      });
      if (!transfer) {
        throw new NotFoundException(`Transfer ${id} not found`);
      }
      if (transfer.destinationBranchId !== scope.branchId) {
        throw new ForbiddenException("Only the destination branch can receive this transfer");
      }
      if (transfer.status !== TransferStatus.IN_TRANSIT) {
        throw new BadRequestException("Only in-transit transfers can be received");
      }

      const allocations = transfer.lines.flatMap((line) => line.allocations ?? []);
      if (!allocations.length) {
        throw new BadRequestException("Transfer has no shipped allocations to receive");
      }

      const quantityByAllocation = new Map(
        dto.allocations.map((allocation) => [allocation.allocationId, allocation.quantityReceived]),
      );
      if (quantityByAllocation.size !== allocations.length) {
        throw new BadRequestException("All shipped allocations must be confirmed");
      }

      const medicineByLine = new Map(transfer.lines.map((line) => [line.id, line.medicineId]));
      const receiptAllocations = allocations.map((allocation) => {
        const quantityReceived = quantityByAllocation.get(allocation.id);
        if (quantityReceived == null) {
          throw new BadRequestException("Missing allocation receipt quantity");
        }
        if (quantityReceived > allocation.quantityShipped) {
          throw new BadRequestException("Received quantity exceeds shipped quantity");
        }
        const medicineId = medicineByLine.get(allocation.transferLineId);
        if (!medicineId) {
          throw new BadRequestException("Allocation is missing a transfer line reference");
        }
        return {
          sourceLotId: allocation.lotId,
          medicineId,
          lotCode: allocation.lotCode,
          expiryDate: allocation.expiryDate,
          unitCost: allocation.unitCost,
          quantityReceived,
        };
      });

      const sourceLotIds = Array.from(
        new Set(receiptAllocations.map((allocation) => allocation.sourceLotId)),
      );
      const sourceLots = await lotRepo.find({
        where: {
          id: In(sourceLotIds),
          tenantId: scope.tenantId,
          branchId: transfer.sourceBranchId,
        },
        lock: { mode: "pessimistic_write" },
      });
      if (sourceLots.length !== sourceLotIds.length) {
        throw new NotFoundException("One or more source lots could not be located");
      }

      const medicineIds = Array.from(
        new Set(receiptAllocations.map((allocation) => allocation.medicineId)),
      );
      const destinationLots = await lotRepo.find({
        where: {
          tenantId: scope.tenantId,
          branchId: transfer.destinationBranchId,
          medicineId: In(medicineIds),
        },
        lock: { mode: "pessimistic_write" },
      });

      const { totalsByMedicine, destinationLots: updatedDestinationLots } =
        applyTransferReceiptAdjustments(
          sourceLots,
          destinationLots,
          receiptAllocations,
          (allocation) =>
            lotRepo.create({
              tenantId: scope.tenantId,
              branchId: transfer.destinationBranchId,
              medicineId: allocation.medicineId,
              lotCode: allocation.lotCode,
              expiryDate: allocation.expiryDate,
              unitCost: allocation.unitCost,
              quantityOnHand: 0,
            }),
        );

      await lotRepo.save(sourceLots);

      const destinationDeltas = new Map<string, number>();
      for (const allocation of receiptAllocations) {
        const key = `${allocation.medicineId}:${allocation.lotCode}:${allocation.expiryDate}:${allocation.unitCost}`;
        destinationDeltas.set(key, (destinationDeltas.get(key) ?? 0) + allocation.quantityReceived);
      }

      for (const lot of updatedDestinationLots) {
        const key = `${lot.medicineId}:${lot.lotCode}:${lot.expiryDate}:${lot.unitCost}`;
        const delta = destinationDeltas.get(key) ?? 0;
        if (lot.status === InventoryLotStatus.RECALLED) {
          throw new BadRequestException(
            `Lot ${lot.lotCode} is recalled and cannot be received into stock.`,
          );
        }
        await saveLotWithRetry(lotRepo, lot, delta, {
          tenantId: scope.tenantId,
          branchId: transfer.destinationBranchId,
          medicineId: lot.medicineId,
          lotCode: lot.lotCode,
          expiryDate: lot.expiryDate,
          unitCost: lot.unitCost,
        });
      }

      for (const [medicineId, quantity] of totalsByMedicine.entries()) {
        let sourceOverlay = await overlayRepo.findOne({
          where: {
            tenantId: scope.tenantId,
            branchId: transfer.sourceBranchId,
            medicineId,
          },
          lock: { mode: "pessimistic_write" },
        });
        if (!sourceOverlay) {
          sourceOverlay = overlayRepo.create({
            tenantId: scope.tenantId,
            branchId: transfer.sourceBranchId,
            medicineId,
            stockQuantity: 0,
            reorderMin: null,
            reorderMax: null,
            binLocation: null,
            localPrice: null,
            localCost: null,
          });
        }
        sourceOverlay.stockQuantity -= quantity;
        await saveOverlayWithRetry(overlayRepo, sourceOverlay, -quantity, {
          tenantId: scope.tenantId,
          branchId: transfer.sourceBranchId,
          medicineId,
        });

        let destinationOverlay = await overlayRepo.findOne({
          where: {
            tenantId: scope.tenantId,
            branchId: transfer.destinationBranchId,
            medicineId,
          },
          lock: { mode: "pessimistic_write" },
        });
        if (!destinationOverlay) {
          destinationOverlay = overlayRepo.create({
            tenantId: scope.tenantId,
            branchId: transfer.destinationBranchId,
            medicineId,
            stockQuantity: 0,
            reorderMin: null,
            reorderMax: null,
            binLocation: null,
            localPrice: null,
            localCost: null,
          });
        }
        destinationOverlay.stockQuantity += quantity;
        await saveOverlayWithRetry(overlayRepo, destinationOverlay, quantity, {
          tenantId: scope.tenantId,
          branchId: transfer.destinationBranchId,
          medicineId,
        });
      }

      for (const allocation of allocations) {
        const quantityReceived = quantityByAllocation.get(allocation.id) ?? 0;
        allocation.quantityReceived = quantityReceived;
      }
      await allocationRepo.save(allocations);

      const hasVariance = allocations.some(
        (allocation) => allocation.quantityReceived !== allocation.quantityShipped,
      );
      transfer.status = hasVariance
        ? TransferStatus.RECEIVED_WITH_VARIANCE
        : TransferStatus.RECEIVED;
      transfer.receivedAt = new Date();
      transfer.receivedBy = userId;
      await transferRepo.save(transfer);

      return transferRepo.findOneOrFail({
        where: { id: transfer.id },
        relations: {
          sourceBranch: true,
          destinationBranch: true,
          lines: { allocations: true, medicine: true },
        },
      });
    });

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: userId,
      action: "transfer.received",
      entityType: "transfer",
      entityId: transfer.id,
      metadata: {
        sourceBranchId: transfer.sourceBranchId,
        destinationBranchId: transfer.destinationBranchId,
        status: transfer.status,
      },
    });

    return this.buildTransferResponse(transfer);
  }
}
