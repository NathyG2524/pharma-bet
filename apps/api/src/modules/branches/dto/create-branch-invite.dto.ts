import { IsEmail, IsIn, IsUUID } from "class-validator";

export class CreateBranchInviteDto {
  @IsEmail()
  email!: string;

  @IsUUID()
  branchId!: string;

  @IsIn(["branch_manager", "branch_user"])
  role!: "branch_manager" | "branch_user";
}
