import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Repository } from "typeorm";
import type { InventoryLot } from "../../entities/inventory-lot.entity";
import { InventoryLotStatus } from "../../entities/inventory-lot.entity";
import type { InventoryMovement } from "../../entities/inventory-movement.entity";
import type { SupplierReturnLine } from "../../entities/supplier-return-line.entity";
import type { SupplierReturn } from "../../entities/supplier-return.entity";
import { SupplierReturnsService } from "./supplier-returns.service";

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

const makeLine = (overrides?: Partial<SupplierReturnLine>): SupplierReturnLine =>
  ({
    id: "line-1",
    returnId: "ret-1",
    tenantId: "tenant-1",
    branchId: "branch-1",
    lotId: "lot-1",
    medicineId: "med-1",
    quantity: 10,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as SupplierReturnLine;

const makeReturn = (overrides?: Partial<SupplierReturn>): SupplierReturn =>
  ({
    id: "ret-1",
    tenantId: "tenant-1",
    branchId: "branch-1",
    supplierId: "sup-1",
    sourcePurchaseOrderId: null,
    sourceReceiptId: null,
    status: "draft",
    notes: null,
    requestedByUserId: "user-1",
    hqConfirmedByUserId: null,
    hqConfirmedAt: null,
    hqConfirmationNotes: null,
    approvalInstanceId: null,
    dispatchedAt: null,
    dispatchedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lines: [makeLine()],
    ...overrides,
  }) as SupplierReturn;

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
  savedReturn?: Partial<SupplierReturn>;
}) => {
  const lot = makeLot({ quantityOnHand: options?.lotQty ?? 100 });
  const savedLots = [lot];

  const returnStorage = { ...makeReturn(), ...(options?.savedReturn ?? {}) };

  const returnRepo = {
    find: async () => [],
    findOne: async () => returnStorage as SupplierReturn,
    save: async (input: SupplierReturn) => {
      Object.assign(returnStorage, input);
      return returnStorage as SupplierReturn;
    },
    create: (input: unknown) => input as SupplierReturn,
  };

  const lineRepo = {
    find: async () => [],
    findOne: async () => null,
    save: async (input: unknown) => input,
    create: (input: unknown) => input,
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

  const service = new SupplierReturnsService(
    returnRepo as unknown as Repository<SupplierReturn>,
    lineRepo as unknown as Repository<SupplierReturnLine>,
    lotRepo as unknown as Repository<InventoryLot>,
    movementRepo as unknown as Repository<InventoryMovement>,
    auditEventsService as never,
    approvalsService as never,
  );

  return { service, savedLots, returnStorage };
};

describe("SupplierReturnsService – approval and dispatch gate", () => {
  it("dispatching without approval throws ForbiddenException", async () => {
    const { service } = createService({
      approvalStatus: "pending",
      savedReturn: {
        status: "pending_approval",
        approvalInstanceId: "approval-1",
        lines: [makeLine()],
      },
    });
    const context = makeContext();
    await assert.rejects(
      () => service.dispatch(context, "ret-1"),
      (err: Error) => {
        assert.ok(
          err.message.includes("fully approved") || err.constructor.name === "ForbiddenException",
          `Expected ForbiddenException, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("dispatching rejected return throws BadRequestException", async () => {
    const { service } = createService({
      approvalStatus: "rejected",
      savedReturn: {
        status: "rejected",
        approvalInstanceId: "approval-1",
        lines: [makeLine()],
      },
    });
    const context = makeContext();
    await assert.rejects(
      () => service.dispatch(context, "ret-1"),
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

  it("dispatching approved return decrements lot correctly", async () => {
    const initialQty = 100;
    const returnQty = 10;

    const { service, savedLots } = createService({
      lotQty: initialQty,
      approvalStatus: "approved",
      savedReturn: {
        status: "pending_approval",
        approvalInstanceId: "approval-1",
        lines: [makeLine({ quantity: returnQty })],
      },
    });

    const context = makeContext();
    const result = await service.dispatch(context, "ret-1");

    assert.equal(result.status, "dispatched");
    assert.equal(savedLots[0].quantityOnHand, initialQty - returnQty);
  });

  it("dispatching more than available throws BadRequestException", async () => {
    const { service } = createService({
      lotQty: 5,
      approvalStatus: "approved",
      savedReturn: {
        status: "pending_approval",
        approvalInstanceId: "approval-1",
        lines: [makeLine({ quantity: 10 })],
      },
    });

    const context = makeContext();
    await assert.rejects(
      () => service.dispatch(context, "ret-1"),
      (err: Error) => {
        assert.ok(
          err.message.toLowerCase().includes("cannot return") ||
            err.constructor.name === "BadRequestException",
          `Expected below-zero error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("double-dispatching throws BadRequestException", async () => {
    const { service } = createService({
      approvalStatus: "approved",
      savedReturn: {
        status: "dispatched",
        approvalInstanceId: "approval-1",
        dispatchedAt: new Date(),
        lines: [makeLine()],
      },
    });
    const context = makeContext();
    await assert.rejects(
      () => service.dispatch(context, "ret-1"),
      (err: Error) => {
        assert.ok(
          err.message.toLowerCase().includes("already dispatched") ||
            err.constructor.name === "BadRequestException",
          `Expected already-dispatched error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("submitting for HQ confirmation requires draft status", async () => {
    const { service } = createService({
      savedReturn: {
        status: "pending_hq_confirmation",
        lines: [makeLine()],
      },
    });
    const context = makeContext();
    await assert.rejects(
      () => service.submitForHqConfirmation(context, "ret-1"),
      (err: Error) => {
        assert.ok(
          err.message.toLowerCase().includes("draft") ||
            err.constructor.name === "BadRequestException",
          `Expected draft-only error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("HQ confirmation requires HQ role", async () => {
    const { service } = createService({
      savedReturn: {
        status: "pending_hq_confirmation",
        lines: [makeLine()],
      },
    });
    // Non-HQ context
    const context = makeContext({ roles: ["branch_user"] });
    await assert.rejects(
      () => service.hqConfirm(context, "ret-1", {}),
      (err: Error) => {
        assert.ok(
          err.message.toLowerCase().includes("hq role") ||
            err.constructor.name === "ForbiddenException",
          `Expected ForbiddenException, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("submitting for dual approval requires hq_confirmed status", async () => {
    const { service } = createService({
      savedReturn: {
        status: "draft",
        lines: [makeLine()],
      },
    });
    const context = makeContext();
    await assert.rejects(
      () => service.submitForApproval(context, "ret-1", {}),
      (err: Error) => {
        assert.ok(
          err.message.toLowerCase().includes("hq-confirmed") ||
            err.constructor.name === "BadRequestException",
          `Expected hq-confirmed-only error, got: ${err.message}`,
        );
        return true;
      },
    );
  });
});
