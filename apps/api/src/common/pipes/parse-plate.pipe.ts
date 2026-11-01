import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidPlate, normalizePlate } from '@monitoring-car/shared';

@Injectable()
export class ParsePlatePipe implements PipeTransform<string, string> {
  transform(value: string) {
    const plate = normalizePlate(value ?? '');
    if (!isValidPlate(plate)) throw new BadRequestException('Placa inválida. Use ABC1D23 ou ABC1234.');
    return plate;
  }
}
