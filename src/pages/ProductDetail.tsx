
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { type Product } from '@/utils/scraper';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    setMounted(true);
    
    // Get products from localStorage
    const storedProductsJson = localStorage.getItem('scraped_products');
    if (!storedProductsJson) {
      toast({
        title: "Error",
        description: "No se encontraron productos. Vuelve a la página principal para cargar productos.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
      const storedProducts = JSON.parse(storedProductsJson) as Product[];
      const foundProduct = storedProducts.find(p => p.id === id);
      
      if (foundProduct) {
        setProduct(foundProduct);
        console.log("Found product:", foundProduct);
        
        // Set page title
        document.title = `${foundProduct.name} | Profesa.info`;
      } else {
        toast({
          title: "Producto no encontrado",
          description: "No se encontró el producto con el ID especificado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error parsing stored products:", error);
      toast({
        title: "Error",
        description: "Error al cargar los datos del producto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);
  
  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="bg-muted h-[400px] rounded-lg w-full"></div>
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-2/3"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold">Producto no encontrado</h1>
          <p className="text-muted-foreground">El producto que estás buscando no existe o ha sido eliminado.</p>
          <Button asChild>
            <Link to="/">Volver a la página principal</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        "min-h-screen pb-12",
        "transition-opacity duration-500",
        mounted ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft size={18} />
            Volver a la lista de productos
          </Link>
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative aspect-square bg-muted/20 rounded-lg overflow-hidden">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-contain" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/400x400?text=Producto';
              }}
            />
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold">{product.name}</h1>
                <span className="text-xl font-semibold">{product.price}</span>
              </div>
              <span className="inline-block px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-md mt-2">
                {product.category}
              </span>
            </div>
            
            <Separator />
            
            <div>
              <h2 className="text-lg font-semibold mb-2">Descripción</h2>
              <p className="text-muted-foreground">{product.description || 'No hay descripción disponible para este producto.'}</p>
            </div>
            
            <div className="pt-4">
              <Button asChild className="w-full">
                <a href={product.url} target="_blank" rel="noopener noreferrer">
                  Ver en la tienda original
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
