import { IsEnum, IsOptional, IsString } from "class-validator";
import { UserRole } from "../../../entities/user-membership.entity";

export class AssignMembershipDto {
  @IsString()
  userId: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  branchId?: string | null;
}
