/** Minimum age to sell on BigFoods. The server enforces this too. */
export const MIN_SELLER_AGE = 18;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Latest YYYY-MM-DD date of birth that is still 18 or older today. */
export function latestAllowedBirthDate(now = new Date()): string {
  return `${now.getFullYear() - MIN_SELLER_AGE}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** True when the YYYY-MM-DD date is a real date and the person is 18 or older. */
export function isAtLeast18(dob: string, now = new Date()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const birth = new Date(y, mo - 1, d);
  if (birth.getFullYear() !== y || birth.getMonth() !== mo - 1 || birth.getDate() !== d) return false;
  return dob <= latestAllowedBirthDate(now);
}
