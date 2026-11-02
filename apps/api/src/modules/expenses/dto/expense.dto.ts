import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EXPENSE_CATEGORIES, PART_SYSTEMS, type ExpenseCategoryCode, type PartSystemCode } from '@monitoring-car/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const CATEGORY_CODES = EXPENSE_CATEGORIES.map((c) => c.code);
const PART_CODES = PART_SYSTEMS.map((p) => p.code);
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export class FuelDto {
  @ApiProperty({ example: 37.145 })
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Informe os litros com até 3 casas.' })
  @Min(0.01, { message: 'Informe os litros.' })
  @Max(9999)
  liters: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  fullTank?: boolean;
}

export class CreateExpenseDto {
  @ApiProperty({ enum: CATEGORY_CODES })
  @IsIn(CATEGORY_CODES, { message: 'Categoria inválida.' })
  category: ExpenseCategoryCode;

  @ApiPropertyOptional({ enum: PART_CODES, nullable: true })
  @IsOptional()
  @IsIn(PART_CODES, { message: 'Classificação da peça inválida.' })
  partSystem?: PartSystemCode | null;

  @ApiProperty({ example: 22920, description: 'Valor em centavos' })
  @IsInt({ message: 'Informe um valor maior que zero.' })
  @Min(1, { message: 'Informe um valor maior que zero.' })
  @Max(100_000_000)
  amountCents: number;

  @ApiProperty({ example: '2026-10-28' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Informe a data.' })
  @IsISO8601({ strict: true }, { message: 'Informe a data.' })
  date: string;

  @ApiPropertyOptional({ example: 'Gasolina comum · 38,2 L' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @ApiPropertyOptional({ example: 38420 })
  @IsOptional()
  @IsInt({ message: 'Informe o odômetro em km.' })
  @Min(0)
  @Max(2_000_000)
  odometer?: number | null;

  @ApiPropertyOptional({ example: 'Posto Shell Barra' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(120)
  establishment?: string | null;

  @ApiPropertyOptional({ example: 18000, description: 'Manutenção: valor das peças em centavos' })
  @IsOptional()
  @IsInt({ message: 'Informe o valor das peças.' })
  @Min(0)
  @Max(100_000_000)
  partsCents?: number | null;

  @ApiPropertyOptional({ example: 10900, description: 'Manutenção: valor da mão de obra em centavos' })
  @IsOptional()
  @IsInt({ message: 'Informe o valor da mão de obra.' })
  @Min(0)
  @Max(100_000_000)
  laborCents?: number | null;

  @ApiPropertyOptional({ type: [String], description: 'Ids de fotos enviadas em POST /files, na ordem' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Anexe até 20 fotos.' })
  @IsUUID('4', { each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({ type: FuelDto, nullable: true, description: 'Só para Combustível' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FuelDto)
  fuel?: FuelDto | null;
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({ enum: CATEGORY_CODES })
  @IsOptional()
  @IsIn(CATEGORY_CODES, { message: 'Categoria inválida.' })
  category?: ExpenseCategoryCode;

  @ApiPropertyOptional({ enum: PART_CODES, nullable: true })
  @IsOptional()
  @IsIn(PART_CODES, { message: 'Classificação da peça inválida.' })
  partSystem?: PartSystemCode | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt({ message: 'Informe um valor maior que zero.' })
  @Min(1, { message: 'Informe um valor maior que zero.' })
  @Max(100_000_000)
  amountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Informe a data.' })
  @IsISO8601({ strict: true }, { message: 'Informe a data.' })
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt({ message: 'Informe o odômetro em km.' })
  @Min(0)
  @Max(2_000_000)
  odometer?: number | null;

  @ApiPropertyOptional({ example: 'Posto Shell Barra' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(120)
  establishment?: string | null;

  @ApiPropertyOptional({ example: 18000, description: 'Manutenção: valor das peças em centavos' })
  @IsOptional()
  @IsInt({ message: 'Informe o valor das peças.' })
  @Min(0)
  @Max(100_000_000)
  partsCents?: number | null;

  @ApiPropertyOptional({ example: 10900, description: 'Manutenção: valor da mão de obra em centavos' })
  @IsOptional()
  @IsInt({ message: 'Informe o valor da mão de obra.' })
  @Min(0)
  @Max(100_000_000)
  laborCents?: number | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Anexe até 20 fotos.' })
  @IsUUID('4', { each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({ type: FuelDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => FuelDto)
  fuel?: FuelDto | null;
}

export class ListExpensesQuery {
  @ApiPropertyOptional({ example: '2026-10', description: 'Mês (alternativa a from/to)' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mês inválido.' })
  month?: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @ApiPropertyOptional({ enum: CATEGORY_CODES })
  @IsOptional()
  @IsIn(CATEGORY_CODES)
  category?: ExpenseCategoryCode;

  @ApiPropertyOptional({ enum: PART_CODES })
  @IsOptional()
  @IsIn(PART_CODES)
  partSystem?: PartSystemCode;
}
