import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OIL_CHANGE_INTERVALS } from '../../reminders/reminder-rules';

export class UpdateVehicleDto {
  @ApiPropertyOptional({ example: 38420 })
  @IsOptional()
  @IsInt({ message: 'Informe o odômetro em km.' })
  @Min(0)
  @Max(2_000_000)
  currentOdometer?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(100_000)
  serviceIntervalKm?: number;

  @ApiPropertyOptional({ example: 10000, enum: OIL_CHANGE_INTERVALS, description: '5000 = 6 meses ou 5 mil km; 10000 = 1 ano ou 10 mil km' })
  @IsOptional()
  @IsIn(OIL_CHANGE_INTERVALS, { message: 'Escolha 6 meses ou 5 mil km, ou 1 ano ou 10 mil km.' })
  oilChangeIntervalKm?: number;

  @ApiPropertyOptional({ example: 7932600, nullable: true, description: 'Valor FIPE informado pelo usuário, em centavos; null volta ao valor automático' })
  @IsOptional()
  @IsInt({ message: 'Informe o valor FIPE em reais.' })
  @Min(100, { message: 'Informe o valor FIPE em reais.' })
  @Max(100_000_000, { message: 'Valor FIPE muito alto.' })
  fipeValueCents?: number | null;
}
