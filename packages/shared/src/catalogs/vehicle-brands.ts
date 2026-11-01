export const VEHICLE_BRANDS = ['Fiat', 'Volkswagen', 'Chevrolet', 'Toyota', 'Hyundai', 'Jeep', 'Renault', 'Honda', 'BYD', 'Nissan'] as const;

export type VehicleBrand = (typeof VEHICLE_BRANDS)[number];
