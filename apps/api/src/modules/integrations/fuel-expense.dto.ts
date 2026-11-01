import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizePlate } from '@monitoring-car/shared';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class IntegrationFuelExpenseDto {
  @ApiProperty({ example: 'Posto Shell Barra da Tijuca' })
  @Transform(trim)
  @IsString()
  @Length(2, 120, { message: 'Informe o nome do estabelecimento.' })
  establishment: string;

  @ApiProperty({ example: 189.9, description: 'Valor em reais, com até 2 casas decimais' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe o valor em reais com até 2 casas decimais.' })
  @Min(0.01, { message: 'Informe um valor maior que zero.' })
  @Max(1_000_000)
  amount: number;

  @ApiProperty({ example: '2026-11-01T14:32:00-03:00', description: 'Data e hora do abastecimento (ISO 8601 com fuso)' })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, { message: 'Informe a data e hora com o fuso (ex.: 2026-11-01T14:32:00-03:00).' })
  @IsISO8601({ strict: true }, { message: 'Informe a data e hora com o fuso (ex.: 2026-11-01T14:32:00-03:00).' })
  occurredAt: string;

  @ApiPropertyOptional({ example: 'RIO2A18', description: 'Placa do veículo; sem ela, vai para o veículo ativo' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? normalizePlate(value) : value))
  @Matches(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, { message: 'Placa inválida. Use ABC1D23 ou ABC1234.' })
  plate?: string;

  @ApiPropertyOptional({ example: 32.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe os litros com até 2 casas.' })
  @Min(0.01)
  @Max(9999)
  liters?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  fullTank?: boolean;

  @ApiPropertyOptional({ example: 108650 })
  @IsOptional()
  @IsInt({ message: 'Informe o odômetro em km.' })
  @Min(0)
  @Max(2_000_000)
  odometer?: number;

  @ApiPropertyOptional({ example: 'nota-35261101234', description: 'Id no seu app: reenviar o mesmo id não duplica o gasto' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  externalId?: string;
}
