import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
} as const;

/**
 * Shared modal. Built on Radix Dialog, which gives us a correct focus trap,
 * scroll lock, Escape-to-close, overlay-click-to-close, and the right ARIA
 * wiring for free (previously all hand-rolled — see the old focus-trap effect
 * that leaked listeners on unmount, L6). The public props are unchanged so all
 * existing call sites keep working without edits.
 */
export function Modal({ isOpen, onClose, title, children, footer, size = 'lg' }: ModalProps) {
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] ${sizeMap[size]} -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] focus:outline-none`}
        >
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
            <Dialog.Title className="text-lg font-semibold text-gray-900 tracking-tight">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="p-6 overflow-y-auto">{children}</div>

          {footer && (
            <div className="p-6 border-t border-gray-100 bg-gray-50 mt-auto flex justify-end gap-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
