import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export class SaveInsuranceDto {
  @ApiProperty({ example: 'Porto Seguro' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 80, { message: 'Informe a seguradora.' })
  insurer: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60)
  policyNumber?: string | null;

  @ApiProperty({ example: '2026-03-05' })
  @Matches(DATE, { message: 'Informe o início da vigência.' })
  @IsISO8601({ strict: true }, { message: 'Informe o início da vigência.' })
  startDate: string;

  @ApiProperty({ example: '2027-03-05' })
  @Matches(DATE, { message: 'Informe o fim da vigência.' })
  @IsISO8601({ strict: true }, { message: 'Informe o fim da vigência.' })
  endDate: string;

  @ApiPropertyOptional({ example: 312400 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  premiumCents?: number | null;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number | null;

  @ApiPropertyOptional({ example: 350000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  deductibleCents?: number | null;

  @ApiPropertyOptional({ example: '(21) 3333-4444' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(120)
  brokerContact?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  fileId?: string | null;
}
