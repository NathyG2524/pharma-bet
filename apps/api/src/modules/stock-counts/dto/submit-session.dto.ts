import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SubmitSessionDto {
  @IsOptional()
  @IsString()
  bmDelegateUserId?: string;

  @IsOptional()
  @IsBoolean()
  bmUnavailable?: boolean;
}
