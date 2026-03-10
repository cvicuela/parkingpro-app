import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalItems, pageSize = 15, onPageChange }) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-medium">{start}</span> a <span className="font-medium">{end}</span> de{' '}
        <span className="font-medium">{totalItems}</span> registros
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Página anterior"
        >
          <ChevronLeft size={18} />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let page;
          if (totalPages <= 7) {
            page = i + 1;
          } else if (currentPage <= 4) {
            page = i + 1;
          } else if (currentPage >= totalPages - 3) {
            page = totalPages - 6 + i;
          } else {
            page = currentPage - 3 + i;
          }
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                page === currentPage
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Página siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
