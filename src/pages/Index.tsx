
import { useState, useEffect } from 'react';
import { type Product } from '@/utils/scraper';
import { extractCategories, scrapeProducts } from '@/utils/scraper';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import { Store, Search, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

import CategoryNavigation from '@/components/CategoryNavigation';
import ProductDisplay from '@/components/ProductDisplay';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Index = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12; // Increased from 9 to show more products
  
  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Try to load from localStorage first for instant display
        const savedData = localStorage.getItem('scraped_products');
        const savedTimestamp = localStorage.getItem('scraped_timestamp');
        
        if (savedData && savedTimestamp) {
          try {
            const parsedData = JSON.parse(savedData) as Product[];
            setProducts(parsedData);
            setCategories(extractCategories(parsedData));
            setLastUpdated(savedTimestamp);
            console.log(`Loaded ${parsedData.length} products from cache`);
          } catch (e) {
            console.error('Error loading saved data:', e);
          }
        }
        
        // Always fetch fresh data
        console.log('Fetching new products...');
        const mainSiteUrl = 'https://profesa.info/';
        
        const result = await scrapeProducts(mainSiteUrl, {
          recursive: true,
          maxDepth: 3,
          includeProductPages: true
        });
        
        if (result.success) {
          console.log(`Successfully fetched ${result.products.length} products`);
          
          // Only update if we found products
          if (result.products.length > 0) {
            setProducts(result.products);
            setCategories(extractCategories(result.products));
            setLastUpdated(result.lastUpdated);
            
            // Save to localStorage for persistence
            localStorage.setItem('scraped_products', JSON.stringify(result.products));
            localStorage.setItem('scraped_timestamp', result.lastUpdated);
            
            toast({
              title: "¡Productos cargados!",
              description: `Se han encontrado ${result.products.length} productos en ${result.products.length > 0 ? extractCategories(result.products).length : 0} categorías.`,
            });
          } else if (!savedData) {
            // Only show error if we don't have cached data
            toast({
              title: "No se encontraron productos",
              description: "Se están mostrando productos de demostración.",
              variant: "destructive",
            });
          }
        } else {
          console.error('Error fetching products:', result.error);
          if (!savedData) {
            toast({
              title: "Error al cargar productos",
              description: result.error || "Ocurrió un error desconocido",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error in data fetching:', error);
        if (!localStorage.getItem('scraped_products')) {
          toast({
            title: "Error al cargar productos",
            description: "No se pudieron cargar los productos",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);
  
  // Filter products by category and search query
  const filteredProducts = products
    .filter(product => !activeCategory || product.category === activeCategory)
    .filter(product => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query)
      );
    });
  
  // Pagination logic
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Generate page numbers for pagination
  const pageNumbers = [];
  const maxPagesToShow = 5;
  
  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
  }
  
  // Animation on mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <div className="min-h-screen pb-12">
      {/* Header section */}
      <header 
        className={cn(
          "relative flex flex-col items-center justify-center text-center py-12 px-6",
          "bg-gradient-to-b from-background to-muted/20",
          "transition-all duration-1000",
          mounted ? "opacity-100" : "opacity-0"
        )}
      >
        <div 
          className={cn(
            "absolute inset-0 bg-grid-black/[0.02] bg-[length:20px_20px]",
            "dark:bg-grid-white/[0.02]"
          )}
        />
        <div className="relative w-full max-w-4xl mx-auto space-y-4">
          <div className="mx-auto flex justify-center mb-4">
            <Store size={48} className="text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            ¡Sorpresa! Catálogo Completo
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Se han extraído todos los productos automáticamente. Explora por categoría o usa el buscador.
          </p>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 animate-fade-in">
        {/* Search and filter section */}
        <div 
          className={cn(
            "mb-6 transition-all duration-700 transform",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Buscar productos por nombre, descripción, marca..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground flex items-center">
              <span>Mostrando {filteredProducts.length} de {products.length} productos</span>
            </div>
          </div>
        </div>
        
        {/* Products section */}
        <section 
          className={cn(
            "animate-slide-in",
            "transition-all duration-700 delay-300 transform",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Store size={24} className="text-primary" />
              <h2 className="text-2xl font-bold">Productos</h2>
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
            </div>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Actualizado: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          
          {/* Category navigation */}
          <CategoryNavigation 
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
          
          {/* Product display */}
          <ProductDisplay products={currentProducts} isLoading={isLoading} />
          
          {/* Pagination */}
          {!isLoading && filteredProducts.length > 0 && (
            <Pagination className="my-8">
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="cursor-pointer"
                    />
                  </PaginationItem>
                )}
                
                {pageNumbers.map(number => (
                  <PaginationItem key={number}>
                    <PaginationLink 
                      isActive={number === currentPage}
                      onClick={() => handlePageChange(number)}
                      className="cursor-pointer"
                    >
                      {number}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="cursor-pointer"
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
          
          {/* No results message */}
          {!isLoading && filteredProducts.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No se encontraron productos</h3>
              <p className="text-muted-foreground">
                No hay resultados para "{searchQuery}". Por favor, intenta con otra búsqueda.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
