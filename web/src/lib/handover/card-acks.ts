import type { Card } from '@/lib/handover/types';
import { isUrgentPriorityCard } from '@/lib/handover/card-utils';

export type CardAckSummary = {
  read: string[];
  unread: string[];
};

export function cardAckStaffSet(card: Card): Set<string> {
  return new Set(card.card_acknowledgments.map((ack) => ack.staff_name.trim()).filter(Boolean));
}

export function hasStaffAckedCard(card: Card, staffName: string): boolean {
  const name = staffName.trim();
  if (!name) return false;
  return cardAckStaffSet(card).has(name);
}

export function cardAckSummary(card: Card, activeStaffNames: string[]): CardAckSummary {
  const acked = cardAckStaffSet(card);
  const read = activeStaffNames.filter((name) => acked.has(name));
  const unread = activeStaffNames.filter((name) => !acked.has(name));
  return { read, unread };
}

export function isTeamAckPending(card: Card, activeStaffNames: string[]): boolean {
  if (!isUrgentPriorityCard(card) || !activeStaffNames.length) return false;
  return cardAckSummary(card, activeStaffNames).unread.length > 0;
}

export function isUnackedUrgentCardForStaff(card: Card, staffName: string): boolean {
  if (!isUrgentPriorityCard(card)) return false;
  const name = staffName.trim();
  if (!name) return card.card_acknowledgments.length === 0;
  return !hasStaffAckedCard(card, name);
}

export function isUnackedUrgentCard(
  card: Card,
  context?: { staffName?: string; activeStaffNames?: string[] },
): boolean {
  if (!isUrgentPriorityCard(card)) return false;
  if (context?.staffName?.trim()) {
    return isUnackedUrgentCardForStaff(card, context.staffName);
  }
  if (context?.activeStaffNames?.length) {
    return isTeamAckPending(card, context.activeStaffNames);
  }
  return card.card_acknowledgments.length === 0;
}
