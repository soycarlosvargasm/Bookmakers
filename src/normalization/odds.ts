export type OddsFormat = "decimal" | "american" | "fractional";

export const oddsToDecimal = (raw: string | number, format: OddsFormat): number | null => {
  const value = String(raw).trim();
  if (!value) return null;

  if (format === "decimal") {
    const decimal = Number(value);
    return Number.isFinite(decimal) && decimal >= 1 ? decimal : null;
  }
  if (format === "american") {
    const american = Number(value.replace(/^\+/, ""));
    if (!Number.isFinite(american) || american === 0) return null;
    return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
  }
  const parts = value.split("/");
  if (parts.length !== 2) return null;
  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 && numerator >= 0
    ? 1 + numerator / denominator
    : null;
};
