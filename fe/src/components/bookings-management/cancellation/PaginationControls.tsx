'use client';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalEntries,
  startIndex,
  endIndex,
  goToPage
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between px-2 py-4 text-sm text-muted-foreground">
      <div>
        Showing {startIndex + 1} to {Math.min(endIndex, totalEntries)} of {totalEntries} entries
      </div>
      <div className="flex space-x-1">
        <button 
          className="px-3 py-1 rounded border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage === 1}
          onClick={() => goToPage(1)}
        >
          «
        </button>
        <button 
          className="px-3 py-1 rounded border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage === 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          ‹
        </button>
        
        {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 3) {
            pageNum = i + 1;
          } else if (currentPage <= 2) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 1) {
            pageNum = totalPages - 2 + i;
          } else {
            pageNum = currentPage - 1 + i;
          }
          
          return (
            <button
              key={pageNum}
              className={`px-3 py-1 rounded border ${currentPage === pageNum ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => goToPage(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}

        <button 
          className="px-3 py-1 rounded border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage === totalPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          ›
        </button>
        <button 
          className="px-3 py-1 rounded border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage === totalPages}
          onClick={() => goToPage(totalPages)}
        >
          »
        </button>
      </div>
    </div>
  );
}