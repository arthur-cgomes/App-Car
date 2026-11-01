import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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
}
