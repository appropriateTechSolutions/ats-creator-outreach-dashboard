import React from 'react';
import * as DM from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';

// ─── MultiSelect ──────────────────────────────────────────────────────
// Accessible checkbox dropdown (keyboard + screen-reader operable), a drop-in
// for the hand-rolled status filter. Stays open while toggling.

export interface MultiSelectOption {
  id: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  ariaLabel?: string;
}

export function MultiSelect({
  options,
  selected,
  onToggle,
  placeholder = 'All',
  triggerClassName = '',
  ariaLabel,
}: MultiSelectProps) {
  return (
    <DM.Root>
      <DM.Trigger
        aria-label={ariaLabel}
        className={`flex justify-between items-center gap-2 outline-none focus:ring-1 focus:ring-primary-500 ${
          triggerClassName ||
          'w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 font-outfit'
        }`}
      >
        <span className="truncate">
          {selected.length === 0 ? placeholder : `${selected.length} Selected`}
        </span>
        <ChevronDown
          size={14}
          className="text-gray-400 data-[state=open]:rotate-180 transition-transform"
        />
      </DM.Trigger>

      <DM.Portal>
        <DM.Content
          align="start"
          sideOffset={4}
          className="z-[70] min-w-[200px] bg-white border border-gray-150 rounded-xl shadow-hover py-1.5 animate-[fadeIn_0.12s_ease]"
        >
          {options.map((item) => {
            const checked = selected.includes(item.id);
            return (
              <DM.CheckboxItem
                key={item.id}
                checked={checked}
                onCheckedChange={() => onToggle(item.id)}
                onSelect={(e) => e.preventDefault()}
                className="flex items-center gap-3 px-4 py-2 text-xs text-gray-700 cursor-pointer select-none outline-none data-[highlighted]:bg-gray-50"
              >
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                    checked ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300'
                  }`}
                >
                  {checked && <Check size={11} strokeWidth={3} />}
                </span>
                <span>{item.label}</span>
              </DM.CheckboxItem>
            );
          })}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

// ─── ActionMenu ───────────────────────────────────────────────────────
// Accessible "⋯ / caret" menu for row actions, replacing hand-rolled
// button+div menus with click-outside overlays.

export interface ActionMenuItem {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  trigger: React.ReactNode;
  items: ActionMenuItem[];
  align?: 'start' | 'end';
  ariaLabel?: string;
}

export function ActionMenu({
  trigger,
  items,
  align = 'end',
  ariaLabel = 'Actions',
}: ActionMenuProps) {
  return (
    <DM.Root>
      <DM.Trigger aria-label={ariaLabel} className="outline-none focus:outline-none">
        {trigger}
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align={align}
          sideOffset={4}
          className="z-[70] min-w-[180px] bg-white border border-gray-150 rounded-xl shadow-hover py-1.5 animate-[fadeIn_0.12s_ease]"
        >
          {items.map((item, i) => (
            <DM.Item
              key={i}
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={`flex items-center gap-2.5 px-4 py-2 text-xs cursor-pointer select-none outline-none data-[highlighted]:bg-gray-50 data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed ${
                item.destructive ? 'text-red-600 data-[highlighted]:bg-red-50' : 'text-gray-700'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
