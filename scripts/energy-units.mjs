export const TO_WH = { Wh: 1, kWh: 1e3, MWh: 1e6 };

export function energyInWh(value, unit) {
  if (!Object.hasOwn(TO_WH, unit)) throw new Error(`Unsupported energy unit: ${unit}`);
  return value * TO_WH[unit];
}
