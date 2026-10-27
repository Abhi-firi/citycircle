export type WaitlistProgress = {
  /** 0 to 100, whole number. */
  percent: number;
  /** People still needed to reach the target (never negative). */
  remaining: number;
  reached: boolean;
};

export function waitlistProgress(count: number, target: number): WaitlistProgress {
  const safeCount = Math.max(0, Math.floor(count));
  const safeTarget = Math.max(1, Math.floor(target));
  return {
    percent: Math.min(100, Math.floor((safeCount / safeTarget) * 100)),
    remaining: Math.max(0, safeTarget - safeCount),
    reached: safeCount >= safeTarget,
  };
}

export function communityKey(citySlug: string, domainSlug: string): string {
  return `${citySlug}/${domainSlug}`;
}
