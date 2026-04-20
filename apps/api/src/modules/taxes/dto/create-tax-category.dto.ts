import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumberString, IsString, MaxLength } from "class-validator";

export class CreateTaxCategoryDto {
  @ApiProperty({ description: "Category name" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: "Tax rate as decimal (e.g. 0.0750)" })
  @IsNotEmpty()
  @IsNumberString()
  @MaxLength(16)
  rate: string;
}
