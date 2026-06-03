import { Info } from 'lucide-react';

// Small info icon with a hover/focus tooltip for contextual helper text.
export const InfoTip = ({ text }: { text: string }) => (
  <span className="no-print group relative inline-flex align-middle">
    <Info size={13} className="text-gray-400 hover:text-gray-600 cursor-help" tabIndex={0} />
    <span
      role="tooltip"
      className="pointer-events-none absolute left-1/2 bottom-full z-30 mb-2 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-center text-xs font-normal normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
    >
      {text}
    </span>
  </span>
);
