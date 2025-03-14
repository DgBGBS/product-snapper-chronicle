
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

const ProductPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
}: ProductPaginationProps) => {
  const [visiblePages, setVisiblePages] = useState<number[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    const calculateVisiblePages = () => {
      const maxVisiblePages = isMobile ? 3 : 5;
      const pages: number[] = [];
      
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      setVisiblePages(pages);
    };
    
    calculateVisiblePages();
  }, [currentPage, totalPages, isMobile]);
  
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-3 select-none bg-background/60 backdrop-blur-sm rounded-lg p-3 border border-border/40 shadow-sm">
      <div className="text-sm text-muted-foreground">
        {totalItems ? (
          <span className="font-medium">
            {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} <span className="text-muted-foreground/70">de</span> {totalItems}
          </span>
        ) : (
          <span className="font-medium">
            Página {currentPage} <span className="text-muted-foreground/70">de</span> {totalPages}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full shadow-sm hover:shadow transition-all"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline text-xs">Anterior</span>
        </Button>
        
        {!isMobile && visiblePages.map(page => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "ghost"}
            size="sm"
            className={`h-8 w-8 rounded-full ${currentPage === page ? 'shadow-md' : 'hover:shadow-sm'} transition-all`}
            onClick={() => onPageChange(page)}
            aria-label={`Página ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </Button>
        ))}
        
        {isMobile && (
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-muted/60">
            {currentPage} / {totalPages}
          </span>
        )}
        
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full shadow-sm hover:shadow transition-all"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline text-xs">Siguiente</span>
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default ProductPagination;
