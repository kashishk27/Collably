const norm = (s: string) => s.trim().toLowerCase();

export function overlap(a: string[], b: string[]): string[] {
  const set = new Set(b.map(norm));
  return [...new Set(a.map(norm))].filter((x) => x && set.has(x));
}

/**
 * Mutual-exchange match score (0-100).
 * Half the score: how many of my wanted skills they offer.
 * Half the score: how many of their wanted skills I offer.
 */
export function matchScore(
  me: { skills_offered: string[]; skills_wanted: string[] },
  other: { skills_offered: string[]; skills_wanted: string[] },
) {
  const theyTeachMe = overlap(me.skills_wanted, other.skills_offered);
  const iTeachThem = overlap(other.skills_wanted, me.skills_offered);
  const part = (hits: number, total: number) => (total ? hits / total : 0);
  const score = Math.round(
    50 * part(theyTeachMe.length, me.skills_wanted.length) +
      50 * part(iTeachThem.length, other.skills_wanted.length),
  );
  return { score, theyTeachMe, iTeachThem };
}

export function parseSkills(input: string): string[] {
  return [...new Set(input.split(",").map((s) => s.trim()).filter(Boolean))];
}
