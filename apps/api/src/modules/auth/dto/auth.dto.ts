import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_RULES_MESSAGE, isStrongPassword, isValidCpf, normalizeBrMobile, normalizeCpf, normalizePlate } from '@monitoring-car/shared';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

const PLATE_PATTERN = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
const PLATE_MESSAGE = 'Placa inválida. Use ABC1D23 (Mercosul) ou ABC1234.';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const toPlate = ({ value }: { value: unknown }) => (typeof value === 'string' ? normalizePlate(value) : value);

@ValidatorConstraint({ name: 'strongPassword' })
class StrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isStrongPassword(value);
  }
  defaultMessage() {
    return PASSWORD_RULES_MESSAGE;
  }
}

@ValidatorConstraint({ name: 'cpf' })
class CpfConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isValidCpf(value);
  }
  defaultMessage() {
    return 'CPF inválido.';
  }
}

export class LoginDto {
  @ApiProperty({ description: 'E-mail ou CPF', example: 'marina@email.com' })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Informe seu e-mail ou CPF.' })
  @MaxLength(254)
  login: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Informe sua senha.' })
  @MaxLength(128)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Marina Souza' })
  @Transform(trim)
  @IsString()
  @Length(2, 120, { message: 'Informe seu nome.' })
  name: string;

  @ApiProperty({ example: 'marina@email.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: '529.982.247-25' })
  @IsNotEmpty({ message: 'Informe seu CPF.' })
  @Validate(CpfConstraint)
  @Transform(({ value }) => (typeof value === 'string' ? normalizeCpf(value) : value))
  cpf: string;

  @ApiProperty({ example: '(21) 98765-4821' })
  @IsNotEmpty({ message: 'Informe seu celular.' })
  @Transform(({ value }) => (typeof value === 'string' ? (normalizeBrMobile(value) ?? value.trim()) : value))
  @Matches(/^\+55\d{11}$/, { message: 'Celular incompleto.' })
  phone: string;

  @ApiProperty({ description: '8+ caracteres, com maiúscula, número e caractere especial' })
  @IsString()
  @Validate(StrongPasswordConstraint)
  password: string;

  @ApiProperty({ description: 'Aceite dos Termos de uso e da Política de privacidade' })
  @Equals(true, { message: 'Aceite os Termos de uso e a Política de privacidade.' })
  acceptTerms: boolean;
}

export class PinRequestDto {
  @ApiProperty({ example: 'RIO2A18' })
  @Transform(toPlate)
  @Matches(PLATE_PATTERN, { message: PLATE_MESSAGE })
  plate: string;
}

export class PinVerifyDto extends PinRequestDto {
  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'Digite os 6 dígitos do código.' })
  code: string;
}

export class CodeDto {
  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'Digite os 6 dígitos do código.' })
  code: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'E-mail ou CPF' })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Informe seu e-mail ou CPF.' })
  @MaxLength(254)
  login: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200)
  token: string;

  @ApiProperty({ description: '8+ caracteres, com maiúscula, número e caractere especial' })
  @IsString()
  @Validate(StrongPasswordConstraint)
  password: string;
}
