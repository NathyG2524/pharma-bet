import { IsString, MinLength } from "class-validator";

export class AcceptInviteDto {
  @IsString()
  @MinLength(1)
  token: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  password: string;
}
