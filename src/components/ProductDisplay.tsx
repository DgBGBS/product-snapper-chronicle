
import { useState, useEffect } from 'react';
import { type Product } from '@/utils/scraper';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";

interface ProductDisplayProps {
  products: Product[];
  isLoading?: boolean;
}

const ProductDisplay = ({ products, isLoading = false }: ProductDisplayProps) => {
  const [mounted, setMounted] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageError = (productId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [productId]: true
    }));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i}
            className="bg-card/50 rounded-lg p-4 animate-pulse h-72"
          >
            <div className="w-full h-40 bg-muted rounded-md mb-4"></div>
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 w-full">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No hay productos disponibles</h3>
          <p className="text-muted-foreground">Intenta actualizar los datos o cambiar de categoría</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      {products.map((product, index) => (
        <div 
          key={product.id}
          className={cn(
            "glass-card card-hover rounded-lg overflow-hidden",
            "transform transition-all duration-500 ease-out",
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}
          style={{ 
            transitionDelay: `${index * 100}ms`,
          }}
        >
          <div className="relative aspect-video overflow-hidden bg-muted/20">
            <Link to={`/product/${product.id}`}>
              {imageErrors[product.id] ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground">Imagen no disponible</span>
                </div>
              ) : (
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                  onError={() => handleImageError(product.id)}
                />
              )}
            </Link>
          </div>
          
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="inline-block px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-md mb-2">
                  {product.category}
                </span>
                <h3 className="font-medium">{product.name}</h3>
              </div>
              <span className="text-sm font-semibold">{product.price}</span>
            </div>
            
            {product.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{product.description}</p>
            )}
            
            <div className="mt-4">
              <Link 
                to={`/product/${product.id}`}
                className="text-sm text-primary hover:underline transition-colors duration-200"
              >
                Ver detalles
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductDisplay;
