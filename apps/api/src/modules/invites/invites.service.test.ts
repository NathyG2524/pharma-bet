import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import type { Invite } from "../../entities/invite.entity";
import { UserRole } from "../../entities/user-membership.entity";
import type { UserMembership } from "../../entities/user-membership.entity";
import type { User } from "../../entities/user.entity";
import type { AuditEventsService } from "../audit-events/audit-events.service";
import type { AuthService } from "../auth/auth.service";
import { InvitesService } from "./invites.service";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function makeFutureDate(offsetMs = 3 * 60 * 60 * 1000): Date {
  return new Date(Date.now() + offsetMs);
}

function makeInvite(overrides: Partial<Invite> = {}): Invite {
  return {
    id: "invite-1",
    tenantId: "tenant-1",
    branchId: null,
    email: "hq@example.com",
    tokenHash: hashToken("valid-token"),
    role: UserRole.HQ_ADMIN,
    expiresAt: makeFutureDate(),
    consumedAt: null,
    revokedAt: null,
    createdByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: null as unknown as Invite["tenant"],
    branch: null,
    ...overrides,
  } as Invite;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "hq@example.com",
    passwordHash: "$2b$10$placeholder",
    platformAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

type InviteRepo = {
  findOne: (options: unknown) => Promise<Invite | null>;
  save: (invite: Invite) => Promise<Invite>;
};

type UserRepo = {
  findOne: (options: unknown) => Promise<User | null>;
  create: (data: Partial<User>) => User;
  save: (user: User) => Promise<User>;
};

type MembershipRepo = {
  findOne: (options: unknown) => Promise<UserMembership | null>;
  create: (data: Partial<UserMembership>) => UserMembership;
  save: (membership: UserMembership) => Promise<UserMembership>;
};

function createService(options: {
  invite: Invite | null;
  anyInvite?: Invite | null;
  existingUser?: User | null;
  existingMembership?: UserMembership | null;
}) {
  let savedInvite: Invite | null = null;
  const createdMemberships: Partial<UserMembership>[] = [];
  const auditEvents: unknown[] = [];

  const storedInvite = options.invite;
  const anyInvite = options.anyInvite ?? options.invite;

  const inviteRepo: InviteRepo = {
    findOne: async (findOptions: { where?: { consumedAt?: unknown } } = {}) => {
      const where = (findOptions as { where?: Record<string, unknown> }).where ?? {};
      const hasActiveFilter = "consumedAt" in where || "revokedAt" in where || "expiresAt" in where;
      if (hasActiveFilter) {
        return storedInvite;
      }
      return anyInvite ?? null;
    },
    save: async (invite: Invite) => {
      savedInvite = invite;
      return invite;
    },
  };

  const newUser = makeUser({ id: "user-new", email: "hq@example.com", passwordHash: "hashed" });
  const userRepo: UserRepo = {
    findOne: async () => options.existingUser ?? null,
    create: (data: Partial<User>) => ({ ...newUser, ...data }) as User,
    save: async (user: User) => user,
  };

  const membershipRepo: MembershipRepo = {
    findOne: async () => options.existingMembership ?? null,
    create: (data: Partial<UserMembership>) => {
      const m = data as UserMembership;
      createdMemberships.push(m);
      return m;
    },
    save: async (membership: UserMembership) => membership,
  };

  const authService = {
    signToken: async (user: User) => `token-for-${user.id}`,
    toView: (user: User) => ({ id: user.id, email: user.email }),
  } as unknown as AuthService;

  const auditEventsService = {
    recordEvent: async (event: unknown) => {
      auditEvents.push(event);
    },
  } as unknown as AuditEventsService;

  const service = new InvitesService(
    inviteRepo as unknown as Repository<Invite>,
    userRepo as unknown as Repository<User>,
    membershipRepo as unknown as Repository<UserMembership>,
    authService,
    auditEventsService,
  );

  return { service, savedInvite: () => savedInvite, createdMemberships, auditEvents };
}

describe("InvitesService.acceptInvite", () => {
  it("happy path: creates user, membership, marks invite consumed, returns auth response", async () => {
    const invite = makeInvite();
    const { service, savedInvite, createdMemberships, auditEvents } = createService({
      invite,
      existingUser: null,
      existingMembership: null,
    });

    const result = await service.acceptInvite({ token: "valid-token", password: "SecurePass1!" });

    assert.ok(result.accessToken, "should return an accessToken");
    assert.ok(result.user.email, "should return user email");

    const consumed = savedInvite();
    assert.ok(consumed?.consumedAt, "invite should be marked consumed");

    assert.equal(createdMemberships.length, 1, "should create one membership");
    assert.equal(createdMemberships[0].tenantId, "tenant-1");
    assert.equal(createdMemberships[0].role, UserRole.HQ_ADMIN);
    assert.equal(createdMemberships[0].branchId, null);

    assert.equal(auditEvents.length, 1, "should record one audit event");
    assert.equal((auditEvents[0] as { action: string }).action, "invite.accepted");
  });

  it("double-submit: returns 400 when invite already consumed", async () => {
    const consumed = makeInvite({ consumedAt: new Date(Date.now() - 1000) });
    const { service } = createService({ invite: null, anyInvite: consumed });

    await assert.rejects(
      () => service.acceptInvite({ token: "valid-token", password: "SecurePass1!" }),
      (err: Error) => {
        assert.ok(err instanceof BadRequestException, "should throw BadRequestException");
        return true;
      },
    );
  });

  it("wrong token: returns 404 when token does not match any invite", async () => {
    const { service } = createService({ invite: null, anyInvite: null });

    await assert.rejects(
      () => service.acceptInvite({ token: "nonexistent-token", password: "SecurePass1!" }),
      (err: Error) => {
        assert.ok(err instanceof NotFoundException, "should throw NotFoundException");
        return true;
      },
    );
  });

  it("revoked token: returns 400 when invite has been revoked", async () => {
    const revoked = makeInvite({ revokedAt: new Date(Date.now() - 1000) });
    const { service } = createService({ invite: null, anyInvite: revoked });

    await assert.rejects(
      () => service.acceptInvite({ token: "valid-token", password: "SecurePass1!" }),
      (err: Error) => {
        assert.ok(err instanceof BadRequestException, "should throw BadRequestException");
        return true;
      },
    );
  });

  it("expired token: returns 400 when invite has expired", async () => {
    const expired = makeInvite({ expiresAt: new Date(Date.now() - 1000) });
    const { service } = createService({ invite: null, anyInvite: expired });

    await assert.rejects(
      () => service.acceptInvite({ token: "valid-token", password: "SecurePass1!" }),
      (err: Error) => {
        assert.ok(err instanceof BadRequestException, "should throw BadRequestException");
        return true;
      },
    );
  });

  it("existing user: sets new password and reuses the user record", async () => {
    const invite = makeInvite();
    const existing = makeUser();
    const { service, savedInvite } = createService({
      invite,
      existingUser: existing,
      existingMembership: null,
    });

    const result = await service.acceptInvite({ token: "valid-token", password: "NewPass1234!" });

    assert.ok(result.user, "should return user");
    assert.ok(savedInvite()?.consumedAt, "invite should be consumed");
  });

  it("existing membership: does not create duplicate membership", async () => {
    const invite = makeInvite();
    const existingMembership = {
      id: "mem-1",
      tenantId: "tenant-1",
      userId: "user-1",
      role: UserRole.HQ_ADMIN,
      branchId: null,
      createdAt: new Date(),
    } as UserMembership;
    const { service, createdMemberships } = createService({
      invite,
      existingUser: makeUser(),
      existingMembership,
    });

    await service.acceptInvite({ token: "valid-token", password: "SecurePass1!" });

    assert.equal(createdMemberships.length, 0, "should not create a duplicate membership");
  });
});

describe("InvitesService.lookupInvite", () => {
  it("returns invite details for a valid token", async () => {
    const invite = makeInvite();
    const { service } = createService({ invite });

    const result = await service.lookupInvite("valid-token");

    assert.equal(result.email, "hq@example.com");
    assert.equal(result.tenantId, "tenant-1");
    assert.equal(result.role, UserRole.HQ_ADMIN);
  });

  it("throws 404 for unknown token", async () => {
    const { service } = createService({ invite: null, anyInvite: null });

    await assert.rejects(() => service.lookupInvite("unknown-token"), NotFoundException);
  });
});
