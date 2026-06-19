import type { HTMLAttributes, LabelHTMLAttributes } from 'react';

export type FieldProps = HTMLAttributes<HTMLLabelElement> & {
  full?: boolean;
  checkbox?: boolean;
  label?: string;
  hint?: string;
};

function mergeClass(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ') || undefined;
}

export function fieldClassName({
  full,
  checkbox,
  className,
}: Pick<FieldProps, 'full' | 'checkbox' | 'className'>) {
  return mergeClass(
    'field',
    full ? 'field--full' : null,
    checkbox ? 'field--checkbox' : null,
    className,
  );
}

export function Field({
  full,
  checkbox,
  label,
  hint,
  className,
  children,
  ...props
}: FieldProps) {
  return (
    <label className={fieldClassName({ full, checkbox, className })} {...props}>
      {checkbox ? (
        <>
          {children}
          {label ? <span>{label}</span> : null}
        </>
      ) : (
        <>
          {label ? <span>{label}</span> : null}
          {children}
        </>
      )}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export type FieldLabelProps = LabelHTMLAttributes<HTMLSpanElement>;

export function FieldLabel({ className, ...props }: FieldLabelProps) {
  return <span className={mergeClass(className)} {...props} />;
}
