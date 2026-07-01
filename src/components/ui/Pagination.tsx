import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

// Shared pagination footer for every creators table. Renders a "Showing X–Y of
// Z" summary plus prev/next + a compact numbered window with ellipses. Hides
// itself when everything fits on a single page.
export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Compact page list: first, last, and a ±1 window around the current page,
  // collapsing the gaps with an ellipsis marker.
  const pages: (number | 'gap')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== 'gap') {
      pages.push('gap');
    }
  }

  const go = (p: number) => onPageChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white ${className}`}
    >
      <p className="text-xs text-gray-500 font-normal">
        Showing <span className="font-medium text-gray-700">{start}</span>–
        <span className="font-medium text-gray-700">{end}</span> of{' '}
        <span className="font-medium text-gray-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => go(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="px-2 text-gray-400 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => go(p)}
              aria-current={p === currentPage ? 'page' : undefined}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-normal transition-colors ${
                p === currentPage ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => go(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
