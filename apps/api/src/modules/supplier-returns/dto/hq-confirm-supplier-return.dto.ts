import { IsOptional, IsString } from "class-validator";

export class HqConfirmSupplierReturnDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
