'use client';

import { Select as S } from 'radix-ui';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { FieldShell } from './field';
import { cn } from './lib/cn';

export type SelectOption = { value: string; label: string; description?: string; icon?: ReactNode };

type Variant = 'field' | 'box' | 'pill' | 'bare';

const EMPTY = '__empty__';

const TRIGGER: Record<Variant, string> = {
  field: 'flex w-full items-center justify-between gap-3 rounded-lg bg-transparent px-3.5 pt-6 pb-2 text-left text-[0.9375rem] outline-none',
  box: 'flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-left text-sm outline-none transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary-text focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_20%,transparent)] data-[state=open]:border-primary-text',
  pill: 'inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface pr-3 pl-4 text-sm font-medium outline-none transition-[border-color,background-color] hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary-text',
  bare: 'flex w-full min-w-0 items-center justify-between gap-2 bg-transparent text-left text-[0.9375rem] font-medium text-fg outline-none',
};

/**
 * Custom select (Radix): keyboard + typeahead + screen-reader semantics, animated popover,
 * optional icons/descriptions per option. `emptyLabel` adds an option that maps to "" (e.g. "Any city").
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  emptyLabel,
  variant = 'box',
  label,
  error,
  hint,
  valid,
  id: idProp,
  name,
  disabled,
  className,
  triggerClassName,
  contentClassName,
  'aria-label': ariaLabel,
  onBlur,
}: {
  value: string | undefined;
  onValueChange: (v: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  variant?: Variant;
  label?: string;
  error?: string;
  hint?: ReactNode;
  valid?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  'aria-label'?: string;
  onBlur?: () => void;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const current = value ? value : emptyLabel ? EMPTY : '';
  const selected = options.find((o) => o.value === value);

  const root = (
    <S.Root
      value={current}
      onValueChange={(v) => onValueChange(v === EMPTY ? '' : v)}
      name={name}
      disabled={disabled}
      onOpenChange={(open) => !open && onBlur?.()}
    >
      <S.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn('group/sel cursor-pointer disabled:cursor-not-allowed disabled:opacity-50', TRIGGER[variant], valid && variant === 'field' && 'pr-10', triggerClassName)}
      >
        <span className={cn('flex min-w-0 items-center gap-2 truncate', !value && !emptyLabel && 'text-fg-muted')}>
          {selected?.icon}
          <S.Value placeholder={placeholder} />
        </span>
        <S.Icon asChild>
          <ChevronDown
            className={cn('size-4 shrink-0 text-fg-muted transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-data-[state=open]/sel:rotate-180', valid && variant === 'field' && 'hidden')}
            aria-hidden
          />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={8}
          collisionPadding={12}
          data-lenis-prevent
          className={cn(
            'pop z-[98] max-h-[min(22rem,var(--radix-select-content-available-height))] max-w-[calc(100vw-1.5rem)] min-w-[min(max(var(--radix-select-trigger-width),12rem),calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-bg-elevated p-1.5 shadow-float',
            contentClassName,
          )}
        >
          <S.ScrollUpButton className="flex h-7 items-center justify-center text-fg-muted">
            <ChevronUp className="size-4" aria-hidden />
          </S.ScrollUpButton>
          <S.Viewport>
            {emptyLabel && <Item value={EMPTY} label={emptyLabel} muted />}
            {emptyLabel && options.length > 0 && <S.Separator className="mx-2 my-1 h-px bg-border" />}
            {options.map((o) => (
              <Item key={o.value} value={o.value} label={o.label} description={o.description} icon={o.icon} />
            ))}
          </S.Viewport>
          <S.ScrollDownButton className="flex h-7 items-center justify-center text-fg-muted">
            <ChevronDown className="size-4" aria-hidden />
          </S.ScrollDownButton>
        </S.Content>
      </S.Portal>
    </S.Root>
  );

  if (variant === 'field' && label) {
    return (
      <FieldShell id={id} label={label} error={error} hint={hint} valid={valid} className={className} floated>
        {root}
      </FieldShell>
    );
  }
  return <div className={cn(variant === 'pill' ? 'inline-flex' : 'w-full min-w-0', className)}>{root}</div>;
}

function Item({ value, label, description, icon, muted }: { value: string; label: string; description?: string; icon?: ReactNode; muted?: boolean }) {
  return (
    <S.Item
      value={value}
      className="group/item relative flex cursor-pointer items-center gap-3 rounded-xl py-2.5 pr-10 pl-3 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-2 data-[state=checked]:font-semibold"
    >
      {icon && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary-text group-data-[highlighted]/item:bg-surface-3">{icon}</span>}
      <span className="min-w-0">
        <S.ItemText>
          <span className={cn(muted && 'text-fg-muted group-data-[state=checked]/item:text-fg')}>{label}</span>
        </S.ItemText>
        {description && <span className="block truncate text-xs font-normal text-fg-muted">{description}</span>}
      </span>
      <S.ItemIndicator className="absolute right-3 grid size-5 place-items-center rounded-full bg-brand-gradient text-primary-fg">
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </S.ItemIndicator>
    </S.Item>
  );
}
