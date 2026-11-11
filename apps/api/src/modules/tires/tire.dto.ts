import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TIRE_DAMAGE_TYPES, TIRE_ROTATION_KINDS, TIRE_SEVERITIES, TIRE_SLOTS, type TirePosition, type TireRotationKind, type TireSeverity, type TireSlot } from '@monitoring-car/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class TireSettingsDto {
  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsInt()
  @Min(5000)
  @Max(30000)
  rotationKm?: number;

  @ApiPropertyOptional({ example: 33 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(60)
  psiFront?: number;

  @ApiPropertyOptional({ example: 33 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(60)
  psiRear?: number;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(60)
  psiLoadedFront?: number;

  @ApiPropertyOptional({ example: 41 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(60)
  psiLoadedRear?: number;

  @ApiPropertyOptional({ example: 35 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(80)
  psiSpare?: number;
}

export class TireModelDto {
  @ApiProperty({ example: 'Pirelli' })
  @IsString()
  @Length(2, 60, { message: 'Informe a marca.' })
  brand: string;

  @ApiProperty({ example: 'Cinturato P7' })
  @IsString()
  @Length(1, 60, { message: 'Informe o modelo.' })
  model: string;

  @ApiProperty({ example: '205/50 R17 89V' })
  @IsString()
  @Length(3, 30, { message: 'Informe a medida.' })
  size: string;

  @ApiPropertyOptional({ example: 68900 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  priceCents?: number | null;

  @ApiPropertyOptional({ example: 55000 })
  @IsOptional()
  @IsInt()
  @Min(10000)
  @Max(150000)
  lifeKm?: number;

  @ApiPropertyOptional({ example: 'Rodoviária Pneus' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  store?: string | null;
}

export class SetupTiresDto extends TireModelDto {
  @ApiProperty({ example: 41200 })
  @IsInt({ message: 'Informe o odômetro da instalação.' })
  @Min(0)
  installedOdometer: number;

  @ApiProperty({ example: '2024-03-12' })
  @Matches(DATE, { message: 'Informe a data da instalação.' })
  @IsISO8601({ strict: true }, { message: 'Informe a data da instalação.' })
  installedDate: string;

  @ApiPropertyOptional({ type: TireSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TireSettingsDto)
  settings?: TireSettingsDto;

  @ApiPropertyOptional({ example: '175/70 R14 84T' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  spareSize?: string | null;

  @ApiPropertyOptional({ example: 2019 })
  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(2100)
  spareYear?: number | null;
}

export class PressureDto {
  @ApiProperty({ example: { DE: 33, DD: 33, TE: 33, TD: 33, EST: 35 } })
  @IsObject()
  values: Partial<Record<TireSlot, number>>;
}

export class RotationDto {
  @ApiProperty({ enum: TIRE_ROTATION_KINDS })
  @IsIn([...TIRE_ROTATION_KINDS])
  kind: TireRotationKind;

  @ApiProperty({ example: 68420 })
  @IsInt({ message: 'Informe o odômetro.' })
  @Min(0)
  odometer: number;

  @ApiProperty({ description: 'Pneu que fica em cada posição' })
  @IsObject()
  positions: Record<TirePosition, string>;
}

export class OccurrenceDto {
  @ApiProperty({ enum: TIRE_SLOTS })
  @IsIn([...TIRE_SLOTS])
  position: TireSlot;

  @ApiProperty({ enum: TIRE_DAMAGE_TYPES })
  @IsIn([...TIRE_DAMAGE_TYPES])
  damageType: string;

  @ApiProperty({ enum: TIRE_SEVERITIES })
  @IsIn([...TIRE_SEVERITIES])
  severity: TireSeverity;

  @ApiProperty()
  @IsBoolean()
  repaired: boolean;

  @ApiPropertyOptional({ example: 4000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  costCents?: number | null;

  @ApiPropertyOptional({ example: 'Borracharia do Zé' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  fileId?: string | null;
}

export class ReplaceTireDto extends TireModelDto {
  @ApiProperty({ enum: TIRE_SLOTS })
  @IsIn([...TIRE_SLOTS])
  position: TireSlot;
}

export class TirePhotosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  treadFileId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  sideFileId?: string | null;
}

