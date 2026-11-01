export interface FuelFill {
  expenseId: string;
  date: string;
  odometer: number | null;
  liters: number;
  fullTank: boolean;
  amountCents: number;
}

export interface FuelFillView extends FuelFill {
  pricePerLiterCents: number;
  kmPerLiter: number | null;
}

export function fuelStats(fills: FuelFill[]) {
  const ordered = [...fills].sort((a, b) => (a.odometer ?? Infinity) - (b.odometer ?? Infinity) || a.date.localeCompare(b.date));
  let lastFull: FuelFill | null = null;
  let litersSince = 0;
  let totalKm = 0;
  let totalLitersMeasured = 0;
  const views: FuelFillView[] = [];

  for (const fill of ordered) {
    let kmPerLiter: number | null = null;
    if (fill.odometer !== null) {
      litersSince += fill.liters;
      if (fill.fullTank) {
        if (lastFull && fill.odometer > lastFull.odometer!) {
          const km = fill.odometer - lastFull.odometer!;
          kmPerLiter = Math.round((km / litersSince) * 10) / 10;
          totalKm += km;
          totalLitersMeasured += litersSince;
        }
        lastFull = fill;
        litersSince = 0;
      }
    }
    views.push({ ...fill, pricePerLiterCents: Math.round(fill.amountCents / fill.liters), kmPerLiter });
  }

  const totalLiters = fills.reduce((sum, fill) => sum + fill.liters, 0);
  const totalCents = fills.reduce((sum, fill) => sum + fill.amountCents, 0);
  return {
    averageKmPerLiter: totalLitersMeasured ? Math.round((totalKm / totalLitersMeasured) * 10) / 10 : null,
    averagePricePerLiterCents: totalLiters ? Math.round(totalCents / totalLiters) : null,
    totalLiters: Math.round(totalLiters * 100) / 100,
    totalCents,
    fills: views.reverse(),
  };
}
