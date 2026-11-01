import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EXPENSE_CATEGORIES, type ExpenseCategoryCode } from '@monitoring-car/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

const CATEGORY_CODES = EXPENSE_CATEGORIES.map((c) => c.code);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateReminderDto {
  @ApiProperty({ example: 'Renovar seguro' })
  @Transform(trim)
  @IsString()
  @Length(2, 120, { message: 'Informe o título do lembrete.' })
  title: string;

  @ApiProperty({ enum: CATEGORY_CODES })
  @IsIn(CATEGORY_CODES, { message: 'Categoria inválida.' })
  category: ExpenseCategoryCode;

  @ApiPropertyOptional({ example: '2027-03-05' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida.' })
  @IsISO8601({ strict: true }, { message: 'Data inválida.' })
  dueDate?: string | null;

  @ApiPropertyOptional({ example: 40000 })
  @IsOptional()
  @IsInt({ message: 'Informe a quilometragem em km.' })
  @Min(1)
  @Max(2_000_000)
  dueOdometer?: number | null;

  @ApiPropertyOptional({ example: 12, description: 'Repetir a cada N meses' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  repeatMonths?: number | null;

  @ApiPropertyOptional({ example: 10000, description: 'Repetir a cada N km' })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(200_000)
  repeatKm?: number | null;
}

export class UpdateReminderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 120, { message: 'Informe o título do lembrete.' })
  title?: string;

  @ApiPropertyOptional({ enum: CATEGORY_CODES })
  @IsOptional()
  @IsIn(CATEGORY_CODES, { message: 'Categoria inválida.' })
  category?: ExpenseCategoryCode;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida.' })
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_000_000)
  dueOdometer?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  repeatMonths?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(200_000)
  repeatKm?: number | null;
}
