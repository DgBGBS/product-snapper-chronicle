
import { useState, useEffect } from 'react';
import { type Product } from '@/utils/scraper';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, Eye, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductDisplayProps {
  products: Product[];
  isLoading?: boolean;
}

const ProductDisplay = ({ products, isLoading = false }: ProductDisplayProps) => {
  const [mounted, setMounted] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const handleImageError = (productId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [productId]: true
    }));
  };

  const toggleFavorite = (productId: string) => {
    const newFavorites = {
      ...favorites,
      [productId]: !favorites[productId]
    };
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      {products.map((product, index) => (
        <div 
          key={product.id}
          className={cn(
            "glass-card rounded-lg overflow-hidden",
            "transform transition-all duration-500 ease-out",
            "border border-border/40 hover:border-border/80 shadow-sm hover:shadow-md",
            "hover:translate-y-[-4px]",
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}
          style={{ 
            transitionDelay: `${Math.min(index * 50, 500)}ms`,
          }}
        >
          <div className="relative aspect-video overflow-hidden bg-muted/20">
            {product.discount && (
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="destructive" className="text-xs font-semibold">
                  {product.discount}
                </Badge>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="icon" 
              className={cn(
                "absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm",
                "hover:bg-background/90",
                favorites[product.id] ? "text-red-500 hover:text-red-600" : "text-muted-foreground"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(product.id);
              }}
            >
              <Heart 
                className={cn(
                  "h-4 w-4 transition-all",
                  favorites[product.id] ? "fill-red-500" : "fill-none"
                )} 
              />
            </Button>
            
            <Link to={`/product/${product.id}`} className="block h-full w-full">
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
              <div className="flex flex-col">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-md mb-2">
                  {product.category}
                </span>
                <Link to={`/product/${product.id}`}>
                  <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>
                {product.brand && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {product.brand}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end">
                {product.originalPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {product.originalPrice}
                  </span>
                )}
                <span className="text-sm font-semibold">{product.price}</span>
                {product.stockStatus && (
                  <span className={cn(
                    "text-xs mt-1",
                    product.stockStatus.toLowerCase().includes('stock') ? 
                      "text-green-600 dark:text-green-400" : 
                      "text-red-600 dark:text-red-400"
                  )}>
                    {product.stockStatus}
                  </span>
                )}
              </div>
            </div>
            
            {product.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{product.description}</p>
            )}
            
            {product.sku && (
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
              </div>
            )}
            
            {product.rating && (
              <div className="flex items-center mt-2">
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      size={12} 
                      className={cn(
                        i < Math.floor(parseFloat(product.rating || '0')) ? "fill-amber-500" : "fill-none"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-1">{product.rating}</span>
              </div>
            )}
            
            <div className="mt-4 flex justify-between items-center gap-2">
              <Button asChild variant="outline" size="sm" className="w-full h-auto py-1.5">
                <Link 
                  to={`/product/${product.id}`}
                  className="flex items-center justify-center gap-1"
                >
                  <Eye size={14} />
                  Ver detalles
                </Link>
              </Button>
              
              <Button 
                variant="default" 
                size="sm" 
                className="w-full h-auto py-1.5"
                onClick={(e) => {
                  e.preventDefault();
                  // Aquí se podría implementar funcionalidad de carrito
                  alert(`Producto "${product.name}" añadido al carrito`);
                }}
              >
                <ShoppingCart size={14} />
                <span className="ml-1">Comprar</span>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductDisplay;
