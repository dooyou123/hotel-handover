import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'urgent' | 'today' | 'info' | 'archived' | 'category';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

function mergeClass(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ') || undefined;
}

export function badgeClassName({
  variant,
  className,
}: Pick<BadgeProps, 'variant' | 'className'>) {
  return mergeClass('badge', variant ? `badge--${variant}` : null, className);
}

export function Badge({ variant, className, ...props }: BadgeProps) {
  return <span className={badgeClassName({ variant, className })} {...props} />;
}
