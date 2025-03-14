
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ExternalLink, ShoppingCart, Tag, Package, Info, ImageOff, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { type Product } from '@/utils/scraper';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  
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
        setActiveImage(foundProduct.imageUrl);
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

  const isPlaceholderImage = (url: string): boolean => {
    // Check for common placeholder patterns
    return !url || 
      url.includes('data:image/svg') || 
      url.includes('placeholder') || 
      url.includes('no-image') || 
      url.includes('noimage') ||
      url.includes('no_image') ||
      url.includes('default-product') ||
      url.includes('dummy-image');
  };

  const handleImageError = (imageUrl: string) => {
    console.log(`Error loading image: ${imageUrl}`);
    setImageErrors(prev => ({
      ...prev,
      [imageUrl]: true
    }));
    
    // If the active image fails, try to set the first working image
    if (activeImage === imageUrl && product) {
      const validImages = [product.imageUrl, ...(product.additionalImages || [])].filter(
        img => !imageErrors[img] && !isPlaceholderImage(img)
      );
      
      if (validImages.length > 0) {
        setActiveImage(validImages[0]);
      }
    }
  };

  const allImages = product ? 
    [product.imageUrl, ...(product.additionalImages || [])].filter(img => img && img.trim() !== '') : 
    [];
  
  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-12 px-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-lg"></div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-6 bg-muted rounded w-1/4"></div>
            </div>
            <div className="h-px bg-muted w-full"></div>
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
            </div>
            <div className="h-10 bg-muted rounded w-full"></div>
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
      <div className="container max-w-6xl mx-auto py-12 px-4">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <div className="flex items-center gap-2">
            <ArrowLeft size={18} />
            Volver a la lista de productos
          </div>
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="relative aspect-square bg-muted/20 rounded-lg overflow-hidden glass-card">
              {imageErrors[activeImage || ''] || isPlaceholderImage(activeImage || '') ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-8">
                  <ImageOff className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <span className="text-sm text-muted-foreground text-center font-medium">
                    Imagen no disponible
                  </span>
                  <span className="text-xs text-muted-foreground text-center mt-2 max-w-md">
                    {product.name}
                  </span>
                </div>
              ) : (
                <img 
                  src={activeImage || product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-contain p-4" 
                  onError={() => handleImageError(activeImage || '')}
                />
              )}
              
              {product.discount && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="destructive" className="text-xs font-semibold">
                    {product.discount}
                  </Badge>
                </div>
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.filter(img => img && img.trim() !== '').map((img, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "w-16 h-16 border rounded-md overflow-hidden flex-shrink-0",
                      activeImage === img ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
                      (imageErrors[img] || isPlaceholderImage(img)) ? "bg-muted/50" : ""
                    )}
                    onClick={() => setActiveImage(img)}
                  >
                    {imageErrors[img] || isPlaceholderImage(img) ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted/30">
                        <ImageOff className="h-4 w-4 text-muted-foreground opacity-70" />
                      </div>
                    ) : (
                      <img 
                        src={img} 
                        alt={`${product.name} - imagen ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(img)}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-md mb-2">
                    {product.category}
                  </span>
                  <h1 className="text-2xl font-bold">{product.name}</h1>
                  {product.brand && (
                    <span className="text-sm text-muted-foreground">
                      Marca: {product.brand}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  {product.originalPrice && (
                    <span className="block text-sm text-muted-foreground line-through">
                      {product.originalPrice}
                    </span>
                  )}
                  <span className="text-2xl font-bold">{product.price}</span>
                </div>
              </div>
              
              {product.rating && (
                <div className="flex items-center mt-2">
                  <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        size={16} 
                        className={cn(
                          i < Math.floor(parseFloat(product.rating || '0')) ? "fill-amber-500" : "fill-none"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">{product.rating}</span>
                </div>
              )}
              
              {product.stockStatus && (
                <div className="mt-2">
                  <span className={cn(
                    "text-sm font-medium",
                    product.stockStatus.toLowerCase().includes('stock') || 
                    product.stockStatus.toLowerCase().includes('disponible') ? 
                      "text-green-600 dark:text-green-400" : 
                      "text-red-600 dark:text-red-400"
                  )}>
                    {product.stockStatus}
                  </span>
                </div>
              )}
            </div>
            
            <Separator />
            
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="description" className="flex-1">Descripción</TabsTrigger>
                {(product.specifications && Object.keys(product.specifications).length > 0) && (
                  <TabsTrigger value="specifications" className="flex-1">Especificaciones</TabsTrigger>
                )}
                {(product.metadata && Object.keys(product.metadata).length > 0) && (
                  <TabsTrigger value="metadata" className="flex-1">Más Detalles</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="description" className="mt-4">
                <div className="prose prose-sm max-w-none">
                  {product.description ? (
                    <div className="text-muted-foreground">{product.description}</div>
                  ) : (
                    <p className="text-muted-foreground italic">No hay descripción disponible para este producto.</p>
                  )}
                </div>
              </TabsContent>
              
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <TabsContent value="specifications" className="mt-4">
                  <div className="space-y-2">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b border-border/50 last:border-0">
                        <div className="font-medium text-sm">{key}</div>
                        <div className="col-span-2 text-sm text-muted-foreground">{value}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
              
              {product.metadata && Object.keys(product.metadata).length > 0 && (
                <TabsContent value="metadata" className="mt-4">
                  <div className="space-y-2">
                    {Object.entries(product.metadata).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b border-border/50 last:border-0">
                        <div className="font-medium text-sm">{key}</div>
                        <div className="col-span-2 text-sm text-muted-foreground">{value}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
            
            <div className="pt-4 space-y-3">
              {product.sku && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Tag size={16} className="mr-2" />
                  <span>SKU / Referencia: {product.sku}</span>
                </div>
              )}
              
              {product.code && product.code !== product.sku && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Package size={16} className="mr-2" />
                  <span>Código: {product.code}</span>
                </div>
              )}
              
              {product.ean && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Barcode size={16} className="mr-2" />
                  <span>EAN / Código de barras: {product.ean}</span>
                </div>
              )}
              
              {product.siteSource && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Info size={16} className="mr-2" />
                  <span>Fuente: {product.siteSource}</span>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button asChild className="flex-1">
                  <a href={product.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    <ExternalLink size={16} />
                    Ver en la tienda original
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
