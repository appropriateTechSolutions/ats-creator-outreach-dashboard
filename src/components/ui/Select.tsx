import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Full visual classes for the trigger. Replaces (not merges with) the default
   *  look, so callers preserve their exact styling without Tailwind conflicts. */
  className?: string;
  ariaLabel?: string;
}

// Structural classes always applied; the visual layer is the caller's className
// or this default (the standard filter-select look).
const TRIGGER_BASE =
  'flex justify-between items-center gap-2 outline-none focus:ring-1 focus:ring-primary-500 data-[placeholder]:text-gray-400';
const TRIGGER_DEFAULT =
  'w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 font-outfit';

// Radix Select reserves the empty string, so we map '' ↔ a sentinel internally.
// Callers keep using '' for the "All / Any" option exactly like a native <select>.
const EMPTY = '__empty__';
const toRadix = (v: string) => (v === '' ? EMPTY : v);
const fromRadix = (v: string) => (v === EMPTY ? '' : v);

/**
 * Accessible single-select built on Radix Select — keyboard operable, screen-reader
 * labelled, portalled (no clipping), styled to match the app's native selects.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  ariaLabel,
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={toRadix(value)} onValueChange={(v) => onChange(fromRadix(v))}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={`${TRIGGER_BASE} ${className || TRIGGER_DEFAULT}`}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown size={14} className="text-gray-400" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-[70] min-w-[var(--radix-select-trigger-width)] max-h-60 overflow-hidden bg-white border border-gray-150 rounded-xl shadow-hover py-1.5 animate-[fadeIn_0.12s_ease]"
        >
          <SelectPrimitive.Viewport>
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value || EMPTY}
                value={toRadix(opt.value)}
                className="relative flex items-center gap-2 px-4 py-2 text-xs text-gray-600 cursor-pointer select-none outline-none data-[highlighted]:bg-gray-50 data-[state=checked]:text-primary-600 data-[state=checked]:bg-primary-50/30 data-[state=checked]:font-medium"
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ml-auto">
                  <Check size={13} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
