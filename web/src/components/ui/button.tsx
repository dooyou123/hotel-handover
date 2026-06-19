import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'add';
export type ButtonSize = 'default' | 'small' | 'xs';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

export type ButtonLinkProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

function mergeClass(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ') || undefined;
}

export function buttonClassName({
  variant = 'primary',
  size = 'default',
  className,
}: CommonProps) {
  return mergeClass(
    'btn',
    variant !== 'primary' ? `btn--${variant}` : 'btn--primary',
    size === 'small' ? 'btn--small' : size === 'xs' ? 'btn--xs' : null,
    className,
  );
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClassName({ variant, size, className })} {...props} />
  );
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <a className={buttonClassName({ variant, size, className })} {...props} />;
}
