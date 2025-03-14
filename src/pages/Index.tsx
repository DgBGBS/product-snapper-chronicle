
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
  const productsPerPage = 12; // Aumentado de 9 a 12 para mostrar más productos
  
  // Obtener datos al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log('Obteniendo nuevos productos...');
        
        // Intentar cargar desde localStorage primero para mostrar instantáneamente
        const savedData = localStorage.getItem('scraped_products');
        const savedTimestamp = localStorage.getItem('scraped_timestamp');
        
        if (savedData && savedTimestamp) {
          try {
            const parsedData = JSON.parse(savedData) as Product[];
            setProducts(parsedData);
            setCategories(extractCategories(parsedData));
            setLastUpdated(savedTimestamp);
            console.log(`Cargados ${parsedData.length} productos desde caché`);
          } catch (e) {
            console.error('Error al cargar datos guardados:', e);
          }
        }
        
        // Siempre obtener datos nuevos
        const result = await scrapeProducts('https://profesa.info/', {
          recursive: true,
          maxDepth: 2,
          includeProductPages: true
        });
        
        if (result.success) {
          console.log(`Obtenidos con éxito ${result.products.length} productos`);
          
          // Solo actualizar si encontramos productos
          if (result.products.length > 0) {
            setProducts(result.products);
            setCategories(extractCategories(result.products));
            setLastUpdated(result.lastUpdated);
            
            // Guardar en localStorage para persistencia
            localStorage.setItem('scraped_products', JSON.stringify(result.products));
            localStorage.setItem('scraped_timestamp', result.lastUpdated);
            
            toast({
              title: "¡Productos cargados!",
              description: `Se han encontrado ${result.products.length} productos en ${result.products.length > 0 ? extractCategories(result.products).length : 0} categorías.`,
            });
          } else if (!savedData) {
            // Solo mostrar error si no tenemos datos en caché
            toast({
              title: "No se encontraron productos",
              description: "Ocurrió un error al extraer datos. Intente más tarde.",
              variant: "destructive",
            });
          }
        } else {
          console.error('Error al obtener productos:', result.error);
          if (!savedData) {
            toast({
              title: "Error al cargar productos",
              description: result.error || "Ocurrió un error desconocido",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error en la obtención de datos:', error);
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
  
  // Filtrar productos por categoría y consulta de búsqueda
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
  
  // Lógica de paginación
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Generar números de página para paginación
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
  
  // Animación al montar
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <div className="min-h-screen pb-12">
      {/* Sección de encabezado */}
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
            ¡Catálogo Completo de Productos!
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Explora nuestra selección de productos por categoría o usa el buscador para encontrar lo que necesitas.
          </p>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 animate-fade-in">
        {/* Sección de búsqueda y filtros */}
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
                  setCurrentPage(1); // Volver a la primera página al buscar
                }}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground flex items-center">
              <span>Mostrando {filteredProducts.length} de {products.length} productos</span>
            </div>
          </div>
        </div>
        
        {/* Sección de productos */}
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
          
          {/* Navegación de categorías */}
          <CategoryNavigation 
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
          
          {/* Mostrar productos */}
          <ProductDisplay products={currentProducts} isLoading={isLoading} />
          
          {/* Paginación */}
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
          
          {/* Mensaje de no resultados */}
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
