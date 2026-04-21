import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../tenancy/auth-context";
import { AllowTenantless, AuthContextParam } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import type { SessionBootstrapDto } from "./session.service";
import { SessionService } from "./session.service";

@Controller("me")
@ApiTags("Session")
@UseGuards(AuthGuard)
export class SessionController {
  constructor(
    @Inject(SessionService)
    private readonly sessionService: SessionService,
  ) {}

  @Get("session")
  @AllowTenantless()
  async getSession(@AuthContextParam() context: AuthContext): Promise<SessionBootstrapDto> {
    return this.sessionService.getBootstrap(context.userId);
  }
}
