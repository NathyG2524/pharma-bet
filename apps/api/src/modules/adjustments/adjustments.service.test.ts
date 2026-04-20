import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Repository } from "typeorm";
import type { InventoryAdjustment } from "../../entities/inventory-adjustment.entity";
import type { InventoryLot } from "../../entities/inventory-lot.entity";
import { InventoryLotStatus } from "../../entities/inventory-lot.entity";
import type { InventoryMovement } from "../../entities/inventory-movement.entity";
import { AdjustmentsService } from "./adjustments.service";

const makeLot = (overrides?: Partial<InventoryLot>): InventoryLot =>
  ({
    id: "lot-1",
    tenantId: "tenant-1",
    branchId: "branch-1",
    medicineId: "med-1",
    lotCode: "L001",
    expiryDate: "2027-01-01",
    unitCost: "10.0000",
    status: InventoryLotStatus.ACTIVE,
    quantityOnHand: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as InventoryLot;

const makeAdj = (overrides?: Partial<InventoryAdjustment>): InventoryAdjustment =>
  ({
    id: "adj-1",
    tenantId: "tenant-1",
    branchId: "branch-1",
    lotId: "lot-1",
    medicineId: "med-1",
    quantity: -10,
    reasonCode: "damage",
    notes: null,
    status: "draft",
    requestedByUserId: "user-1",
    approvalInstanceId: null,
    postedAt: null,
    postedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lot: makeLot(),
    ...overrides,
  }) as InventoryAdjustment;

const makeContext = (extra?: object) => ({
  tenantId: "tenant-1",
  activeBranchId: "branch-1",
  userId: "user-1",
  roles: [] as never[],
  branchIds: ["branch-1"],
  ...extra,
});

type ApprovalsStub = {
  submitApproval: (context: unknown, dto: unknown) => Promise<{ id: string }>;
  findOne: (context: unknown, id: string) => Promise<{ id: string; status: string }>;
};

const createService = (options?: {
  lotQty?: number;
  approvalStatus?: string;
  savedAdjustment?: Partial<InventoryAdjustment>;
}) => {
  const lot = makeLot({ quantityOnHand: options?.lotQty ?? 100 });
  const savedLots = [lot];

  const adjStorage = { ...makeAdj(), ...(options?.savedAdjustment ?? {}) };

  const adjustmentRepo = {
    find: async () => [],
    findOne: async () => adjStorage as InventoryAdjustment,
    save: async (input: InventoryAdjustment) => {
      Object.assign(adjStorage, input);
      return adjStorage as InventoryAdjustment;
    },
    create: (input: unknown) => input as InventoryAdjustment,
  };

  const lotRepo = {
    findOne: async () => savedLots[0] as InventoryLot,
    save: async (input: InventoryLot) => {
      savedLots[0] = input;
      return input;
    },
  };

  const movementRepo = {
    save: async (input: unknown) => input,
    create: (input: unknown) => input,
  };

  const auditEventsService = { recordEvent: async () => undefined };
  const approvalsService: ApprovalsStub = {
    submitApproval: async () => ({ id: "approval-1" }),
    findOne: async () => ({
      id: "approval-1",
      status: options?.approvalStatus ?? "pending",
    }),
  };

  const service = new AdjustmentsService(
    adjustmentRepo as unknown as Repository<InventoryAdjustment>,
    lotRepo as unknown as Repository<InventoryLot>,
    movementRepo as unknown as Repository<InventoryMovement>,
    auditEventsService as never,
    approvalsService as never,
  );

  return { service, savedLots, adjStorage };
};

describe("AdjustmentsService – approval gate", () => {
  it("posting without approval throws ForbiddenException", async () => {
    const { service } = createService({
      approvalStatus: "pending",
      savedAdjustment: {
        status: "pending_approval",
        approvalInstanceId: "approval-1",
      },
    });
    const context = makeContext();
    await assert.rejects(
      () => service.postAdjustment(context, "adj-1"),
      (err: Error) => {
        assert.ok(
          err.message.includes("fully approved") || err.constructor.name === "ForbiddenException",
          `Expected ForbiddenException, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("unapproved (rejected) adjustment cannot be posted", async () => {
    const { service } = createService({
      approvalStatus: "rejected",
      savedAdjustment: {
        status: "rejected",
        approvalInstanceId: "approval-1",
        lot: makeLot(),
      },
    });
    const context = makeContext();
    await assert.rejects(
      () => service.postAdjustment(context, "adj-1"),
      (err: Error) => {
        assert.ok(
          err.message.toLowerCase().includes("rejected") ||
            err.constructor.name === "BadRequestException",
          `Expected rejection-related error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("posting approved decrease reduces lot on-hand correctly", async () => {
    const initialQty = 100;
    const adjustQty = -10;

    const { service, savedLots } = createService({
      lotQty: initialQty,
      approvalStatus: "approved",
      savedAdjustment: {
        quantity: adjustQty,
        status: "pending_approval",
        approvalInstanceId: "approval-1",
        lot: makeLot({ quantityOnHand: initialQty }),
      },
    });

    const context = makeContext();
    const result = await service.postAdjustment(context, "adj-1");

    assert.equal(result.status, "posted");
    assert.equal(savedLots[0].quantityOnHand, initialQty + adjustQty);
  });

  it("posting approved increase raises lot on-hand correctly", async () => {
    const initialQty = 50;
    const adjustQty = 20;

    const { service, savedLots } = createService({
      lotQty: initialQty,
      approvalStatus: "approved",
      savedAdjustment: {
        quantity: adjustQty,
        status: "pending_approval",
        approvalInstanceId: "approval-1",
        lot: makeLot({ quantityOnHand: initialQty }),
      },
    });

    const context = makeContext();
    const result = await service.postAdjustment(context, "adj-1");

    assert.equal(result.status, "posted");
    assert.equal(savedLots[0].quantityOnHand, initialQty + adjustQty);
  });

  it("posting approved decrease that would go below zero throws", async () => {
    const { service } = createService({
      lotQty: 5,
      approvalStatus: "approved",
      savedAdjustment: {
        quantity: -10,
        status: "pending_approval",
        approvalInstanceId: "approval-1",
        lot: makeLot({ quantityOnHand: 5 }),
      },
    });

    const context = makeContext();
    await assert.rejects(
      () => service.postAdjustment(context, "adj-1"),
      (err: Error) => {
        assert.ok(
          err.message.toLowerCase().includes("negative") ||
            err.constructor.name === "BadRequestException",
          `Expected negative quantity error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("double-posting throws BadRequestException", async () => {
    const { service } = createService({
      approvalStatus: "approved",
      savedAdjustment: {
        status: "posted",
        approvalInstanceId: "approval-1",
        postedAt: new Date(),
        lot: makeLot(),
      },
    });
    const context = makeContext();
    await assert.rejects(
      () => service.postAdjustment(context, "adj-1"),
      (err: Error) => {
        assert.ok(
          err.message.toLowerCase().includes("already posted") ||
            err.constructor.name === "BadRequestException",
          `Expected already-posted error, got: ${err.message}`,
        );
        return true;
      },
    );
  });
});
