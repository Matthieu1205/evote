interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3">
      <span className="text-xs text-ink-400">
        {from}–{to} sur {total}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 disabled:opacity-40 hover:bg-ink-50"
        >
          ←
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                p === page
                  ? 'bg-brand-600 text-white'
                  : 'border border-ink-200 text-ink-600 hover:bg-ink-50'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 disabled:opacity-40 hover:bg-ink-50"
        >
          →
        </button>
      </div>
    </div>
  );
}
