import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AcceptInviteDto } from "./dto/accept-invite.dto";
import { InvitesService } from "./invites.service";

@Controller("invites")
@ApiTags("Invites")
export class InvitesController {
  constructor(
    @Inject(InvitesService)
    private readonly invitesService: InvitesService,
  ) {}

  @Get(":token")
  lookup(@Param("token") token: string) {
    return this.invitesService.lookupInvite(token);
  }

  @Post("accept")
  accept(@Body() dto: AcceptInviteDto) {
    return this.invitesService.acceptInvite(dto);
  }
}
