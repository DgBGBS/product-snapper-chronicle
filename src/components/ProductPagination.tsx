
import { useState, useEffect } from 'react';
import { Product } from '@/utils/scraper';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useMobile } from '@/hooks/use-mobile';

interface ProductPaginationProps {
  products: Product[];
  pageSize: number;
  onPageChange: (products: Product[]) => void;
  totalProductsEstimate?: number;
  hasMoreProducts?: boolean;
}

const ProductPagination = ({ 
  products, 
  pageSize, 
  onPageChange,
  totalProductsEstimate,
  hasMoreProducts
}: ProductPaginationProps) => {
  const isMobile = useMobile();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calcular el número total de páginas
  const getTotalPages = () => {
    if (totalProductsEstimate && hasMoreProducts) {
      return Math.ceil(totalProductsEstimate / pageSize);
    }
    return Math.ceil(products.length / pageSize);
  };
  
  const totalPages = getTotalPages();

  // Actualizar los productos paginados cuando cambia la página
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, products.length);
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    onPageChange(paginatedProducts);
  }, [currentPage, products, pageSize, onPageChange]);

  // Si no hay productos o solo hay una página, no mostrar paginación
  if (products.length <= pageSize && !hasMoreProducts) {
    return null;
  }

  // Cambiar de página
  const handlePageChange = (page: number) => {
    // Solo cambiar si es una página válida y tenemos productos para mostrar
    if (page >= 1 && page <= totalPages && (page === 1 || (page - 1) * pageSize < products.length)) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generar los ítems de paginación
  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    
    // Determinar qué páginas mostrar
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Ajustar si estamos cerca del final
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Siempre mostrar la primera página
    if (startPage > 1) {
      items.push(
        <PaginationItem key="first">
          <PaginationLink 
            onClick={() => handlePageChange(1)}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );
      
      // Mostrar elipsis si hay páginas entre la primera y las mostradas
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    // Mostrar páginas del rango calculado
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => handlePageChange(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Mostrar elipsis y última página si hay más páginas
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      items.push(
        <PaginationItem key="last">
          <PaginationLink 
            onClick={() => handlePageChange(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <Pagination className="my-6">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            onClick={() => handlePageChange(currentPage - 1)}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            aria-disabled={currentPage === 1}
          />
        </PaginationItem>
        
        {renderPaginationItems()}
        
        <PaginationItem>
          <PaginationNext 
            onClick={() => handlePageChange(currentPage + 1)}
            className={
              (currentPage === totalPages || (currentPage * pageSize >= products.length && !hasMoreProducts)) 
                ? "pointer-events-none opacity-50" 
                : "cursor-pointer"
            }
            aria-disabled={currentPage === totalPages || (currentPage * pageSize >= products.length && !hasMoreProducts)}
          />
        </PaginationItem>
      </PaginationContent>
      
      {hasMoreProducts && (
        <div className="text-center text-sm text-muted-foreground mt-2">
          Mostrando {Math.min(products.length, currentPage * pageSize)} de aproximadamente {totalProductsEstimate} productos
        </div>
      )}
    </Pagination>
  );
};

export default ProductPagination;
