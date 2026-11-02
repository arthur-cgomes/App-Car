import { ApiPropertyOptional } from '@nestjs/swagger';
import { PIN_CHANNELS, type PinChannel, normalizeBrMobile } from '@monitoring-car/shared';
import { Transform } from 'class-transformer';
import { CpfOrEmptyConstraint, toCpfOrNull } from '../../common/validators/cpf';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Validate,
} from 'class-validator';
import type { UserTheme } from '../users/user.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 120, { message: 'Informe seu nome.' })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(toCpfOrNull)
  @Validate(CpfOrEmptyConstraint)
  cpf?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Foto enviada em POST /files' })
  @IsOptional()
  @IsUUID('4')
  avatarFileId?: string | null;

  @ApiPropertyOptional({ enum: ['DARK', 'LIGHT'] })
  @IsOptional()
  @IsIn(['DARK', 'LIGHT'])
  theme?: UserTheme;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinLoginEnabled?: boolean;

  @ApiPropertyOptional({ enum: PIN_CHANNELS })
  @IsOptional()
  @IsIn(PIN_CHANNELS, { message: 'Escolha e-mail ou SMS.' })
  pinChannel?: PinChannel;
}

export class ChangePhoneDto {
  @ApiPropertyOptional({ example: '(21) 98765-4821' })
  @Transform(({ value }) => (typeof value === 'string' ? (normalizeBrMobile(value) ?? value) : value))
  @Matches(/^\+55\d{11}$/, { message: 'Celular incompleto.' })
  phone: string;
}

export class DeleteAccountDto {
  @ApiPropertyOptional({ description: 'Código do SMS (quando há celular confirmado)' })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'Digite os 6 dígitos do código.' })
  code?: string;

  @ApiPropertyOptional({ description: 'Senha (quando não há celular confirmado)' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}
