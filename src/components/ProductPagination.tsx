
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
    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 select-none">
      <div className="text-sm text-muted-foreground mb-2 sm:mb-0">
        {totalItems ? (
          <span className="text-xs">
            {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
          </span>
        ) : (
          <span className="text-xs">
            Página {currentPage} de {totalPages}
          </span>
        )}
      </div>
      
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {!isMobile && visiblePages.map(page => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8"
            onClick={() => onPageChange(page)}
            aria-label={`Página ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </Button>
        ))}
        
        {isMobile && (
          <span className="text-xs font-medium px-2">
            {currentPage} / {totalPages}
          </span>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProductPagination;
