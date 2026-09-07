import type { AttributionFrame, PolityRule } from '../types';

export function ownerForYear(
  rules: PolityRule[],
  year: number,
  countryName: string,
): string | null {
  const matches = rules.filter(
    (rule) =>
      rule.countryNames.includes(countryName) &&
      year >= rule.from &&
      year <= rule.to,
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0].polityId;
}

export function buildAttributionFrame(
  year: number,
  rules: PolityRule[],
  countryNames: string[],
): AttributionFrame {
  const ownership: Record<string, string | null> = {};
  for (const name of countryNames) {
    ownership[name] = ownerForYear(rules, year, name);
  }
  return { year, ownership };
}
