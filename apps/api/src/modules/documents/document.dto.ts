import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import type { DocumentType } from './vehicle-document.entity';

const TYPES: DocumentType[] = ['IPVA', 'LICENSING', 'CRLV', 'OTHER'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export class SaveDocumentDto {
  @ApiProperty({ enum: TYPES })
  @IsIn(TYPES, { message: 'Tipo de documento inválido.' })
  type: DocumentType;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(2100)
  year?: number | null;

  @ApiPropertyOptional({ example: 198540 })
  @IsOptional()
  @IsInt({ message: 'Informe o valor.' })
  @Min(1, { message: 'Informe um valor maior que zero.' })
  @Max(100_000_000)
  amountCents?: number | null;

  @ApiPropertyOptional({ example: '2026-01-31' })
  @IsOptional()
  @Matches(DATE, { message: 'Data inválida.' })
  @IsISO8601({ strict: true }, { message: 'Data inválida.' })
  dueDate?: string | null;

  @ApiPropertyOptional({ description: 'Arquivo enviado em POST /files (foto ou PDF)' })
  @IsOptional()
  @IsUUID('4')
  fileId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class PayDocumentDto {
  @ApiPropertyOptional({ example: '2026-09-20', description: 'Padrão: hoje' })
  @IsOptional()
  @Matches(DATE, { message: 'Data inválida.' })
  @IsISO8601({ strict: true }, { message: 'Data inválida.' })
  date?: string;
}
