import { ApiPropertyOptional } from '@nestjs/swagger';
import { isValidCpf, normalizeBrMobile, normalizeCpf } from '@monitoring-car/shared';
import { Transform } from 'class-transformer';
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
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import type { UserTheme } from '../users/user.entity';

@ValidatorConstraint({ name: 'cpfOrEmpty' })
class CpfConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return value === null || (typeof value === 'string' && isValidCpf(value));
  }
  defaultMessage() {
    return 'CPF inválido.';
  }
}

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
  @Transform(({ value }) => (typeof value === 'string' ? normalizeCpf(value) || null : value))
  @Validate(CpfConstraint)
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
  smsLoginEnabled?: boolean;
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
