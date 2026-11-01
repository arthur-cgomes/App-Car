import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizePlate } from '@monitoring-car/shared';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const PLATE_PATTERN = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export class ManualVehicleDto {
  @ApiProperty({ example: 'Volkswagen' })
  @Transform(trim)
  @IsString()
  @Length(2, 60, { message: 'Informe a marca.' })
  brand: string;

  @ApiProperty({ example: 'Polo' })
  @Transform(trim)
  @IsString()
  @Length(1, 80, { message: 'Informe o modelo.' })
  model: string;

  @ApiPropertyOptional({ example: 'Highline 1.0 200 TSI' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(120)
  modelVersion?: string | null;

  @ApiPropertyOptional({ example: 'Prata' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(30)
  color?: string | null;

  @ApiPropertyOptional({ example: 2019 })
  @IsOptional()
  @IsInt({ message: 'Ano inválido.' })
  @Min(1950, { message: 'Ano inválido.' })
  @Max(2100, { message: 'Ano inválido.' })
  yearModel?: number | null;
}

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC1D23' })
  @Transform(({ value }) => (typeof value === 'string' ? normalizePlate(value) : value))
  @Matches(PLATE_PATTERN, { message: 'Placa inválida. Use ABC1D23 ou ABC1234.' })
  plate: string;

  @ApiPropertyOptional({ example: 38420 })
  @IsOptional()
  @IsInt({ message: 'Informe o odômetro em km.' })
  @Min(0)
  @Max(2_000_000)
  currentOdometer?: number;

  @ApiPropertyOptional({ example: '2021-03-15' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data da compra inválida.' })
  @IsISO8601({ strict: true }, { message: 'Data da compra inválida.' })
  purchaseDate?: string | null;

  @ApiPropertyOptional({ type: ManualVehicleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualVehicleDto)
  manual?: ManualVehicleDto;
}
