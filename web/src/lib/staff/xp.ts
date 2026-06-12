/** 100 XP마다 레벨 1 상승 (Lv1 = 0–99) */
export const XP_PER_LEVEL = 100;

export const XP_REWARDS = {
  acknowledge_urgent: 10,
  complete_card: 15,
  add_comment: 5,
  read_pinned_notice: 5,
  complete_todo: 8,
} as const;

export type XpRewardKey = keyof typeof XP_REWARDS;

export function xpToLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function xpLevelProgress(xp: number): { level: number; inLevel: number; toNext: number } {
  const level = xpToLevel(xp);
  const floor = (level - 1) * XP_PER_LEVEL;
  return {
    level,
    inLevel: xp - floor,
    toNext: XP_PER_LEVEL,
  };
}

export function xpLevelTitle(level: number): string {
  if (level >= 10) return '베테랑';
  if (level >= 7) return '숙련';
  if (level >= 5) return '중급';
  if (level >= 3) return '견습';
  return '신입';
}
