
import { useState, useEffect } from 'react';
import { type Product } from '@/utils/scraper';
import { extractCategories } from '@/utils/scraper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { Store, Database, RefreshCw } from 'lucide-react';

import CategoryNavigation from '@/components/CategoryNavigation';
import ProductDisplay from '@/components/ProductDisplay';
import DataExtractor from '@/components/DataExtractor';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Handle data fetched from extractor
  const handleDataFetched = (data: Product[], updated: string) => {
    console.log('Index: Data fetched:', data.length, 'products');
    setProducts(data);
    setCategories(extractCategories(data));
    setLastUpdated(updated);
    setIsLoading(false);
  };
  
  // Filter products by category
  const filteredProducts = activeCategory
    ? products.filter(product => product.category === activeCategory)
    : products;
  
  // Animation on mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <div className="min-h-screen pb-12">
      {/* Header section */}
      <header 
        className={cn(
          "relative flex flex-col items-center justify-center text-center py-16 px-6",
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
            Extractor y Organizador de Productos
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Extrae automáticamente datos de productos de profesa.info/tienda, 
            los organiza por categorías y los guarda en Google Sheets
          </p>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 animate-fade-in">
        {/* Data extraction card */}
        <Card 
          className={cn(
            "mb-8 overflow-hidden glass-card shadow-soft",
            "transition-all duration-700 transform border border-border/40",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <CardHeader className="p-6 flex flex-row items-center space-y-0 gap-2">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Panel de Control</CardTitle>
              <CardDescription>Extracción y gestión de datos de productos</CardDescription>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-6">
            <DataExtractor 
              onDataFetched={handleDataFetched} 
              autoFetchInterval={1} 
            />
          </CardContent>
        </Card>
        
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
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <RefreshCw size={14} className="mr-1" />
                  <span>Última actualización: {new Date(lastUpdated).toLocaleString()}</span>
                </div>
              )}
              <span className="text-sm text-muted-foreground ml-2">
                Mostrando {filteredProducts.length} de {products.length} productos
              </span>
            </div>
          </div>
          
          {/* Category navigation */}
          <CategoryNavigation 
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
          
          {/* Product display */}
          <ProductDisplay products={filteredProducts} isLoading={isLoading} />
        </section>
      </main>
    </div>
  );
};

export default Index;
