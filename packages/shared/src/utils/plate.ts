const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export function normalizePlate(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function isValidPlate(input: string): boolean {
  return PLATE_REGEX.test(normalizePlate(input));
}

export function formatPlate(input: string): string {
  const plate = normalizePlate(input);
  if (!PLATE_REGEX.test(plate)) return plate;
  return /^[A-Z]{3}[0-9]{4}$/.test(plate) ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;
}
