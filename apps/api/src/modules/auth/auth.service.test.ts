import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ForbiddenException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { Repository } from "typeorm";
import type { User } from "../../entities/user.entity";
import { AuthService } from "./auth.service";

describe("AuthService.register open registration policy", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAllow = process.env.ALLOW_OPEN_REGISTRATION;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    process.env.ALLOW_OPEN_REGISTRATION = prevAllow;
  });

  it("forbids register in production by default", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_OPEN_REGISTRATION = undefined;
    const service = new AuthService({} as Repository<User>, {} as JwtService);
    await assert.rejects(
      () => service.register({ email: "a@b.com", password: "longenough" }),
      ForbiddenException,
    );
  });

  it("allows register in production when ALLOW_OPEN_REGISTRATION=true", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_OPEN_REGISTRATION = "true";
    const usersRepo = {
      exists: async () => false,
      create: (u: Partial<User>) => u as User,
      save: async (u: User) => u,
    } as unknown as Repository<User>;
    const jwtService = {
      signAsync: async () => "jwt",
    } as unknown as JwtService;
    const service = new AuthService(usersRepo, jwtService);
    const res = await service.register({ email: "new@example.com", password: "longenough" });
    assert.ok(res.accessToken);
  });
});
