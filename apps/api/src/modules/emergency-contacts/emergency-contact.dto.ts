import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EMERGENCY_CONTACT_KINDS, type EmergencyContactKind } from '@monitoring-car/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export class SaveEmergencyContactDto {
  @ApiProperty({ enum: EMERGENCY_CONTACT_KINDS.map((kind) => kind.code) })
  @IsIn(EMERGENCY_CONTACT_KINDS.map((kind) => kind.code), { message: 'Escolha o tipo do contato.' })
  kind: EmergencyContactKind;

  @ApiProperty({ example: 'Porto Seguro' })
  @Transform(trim)
  @IsString()
  @Length(2, 80, { message: 'Informe o nome do contato.' })
  name: string;

  @ApiProperty({ example: '0800 727 0800' })
  @Transform(trim)
  @IsString()
  @Length(3, 30, { message: 'Informe o telefone.' })
  @Matches(/^[+\d\s().-]*\d{3}[+\d\s().-]*$/, { message: 'Telefone inválido.' })
  phone: string;

  @ApiPropertyOptional({ example: 'Apólice 123456' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(200)
  notes?: string | null;
}
