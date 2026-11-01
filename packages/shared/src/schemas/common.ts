import { z } from 'zod';
import { isValidPlate, normalizePlate } from '../utils/plate';

export const plateSchema = z
  .string()
  .transform(normalizePlate)
  .refine(isValidPlate, { message: 'Placa inválida' });

export const centsSchema = z.number().int().nonnegative();

export const uuidSchema = z.string().uuid();
