import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Globe, Info, AlertTriangle } from "lucide-react";
import { scrapeProducts } from "@/utils/scraper";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const WebScraper = () => {
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [corsErrorCount, setCorsErrorCount] = useState<number>(0);
  const navigate = useNavigate();

  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (e) {
      return false;
    }
  };

  const resetState = () => {
    setProgress(0);
    setErrorMessage(null);
    setCorsErrorCount(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    if (!url) {
      toast({
        title: "Error",
        description: "Por favor, introduce una URL válida",
        variant: "destructive",
      });
      return;
    }

    let formattedUrl = url;
    if (!isValidUrl(url)) {
      if (!url.startsWith('http')) {
        formattedUrl = `https://${url}`;
        if (!isValidUrl(formattedUrl)) {
          toast({
            title: "Error",
            description: "La URL introducida no es válida",
            variant: "destructive",
          });
          return;
        }
      } else {
        toast({
          title: "Error",
          description: "La URL introducida no es válida",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    setProgress(10);

    let progressInterval: NodeJS.Timeout | null = null;
    let networkCheckInterval: NodeJS.Timeout | null = null;
    let corsCheckInterval: NodeJS.Timeout | null = null;
    let globalTimeout: NodeJS.Timeout | null = null;
    
    try {
      globalTimeout = setTimeout(() => {
        clearAllIntervals();
        
        const partialResult = {
          success: true,
          products: [],
          lastUpdated: new Date().toISOString(),
          error: "El proceso de rastreo excedió el tiempo máximo permitido. Los resultados pueden ser incompletos."
        };
        localStorage.setItem("scraped_products", JSON.stringify(partialResult.products || []));
        localStorage.setItem("scraped_timestamp", partialResult.lastUpdated);
        localStorage.setItem("scraped_url", formattedUrl);
        
        toast({
          title: "Rastreo incompleto",
          description: "El proceso tomó demasiado tiempo y se ha interrumpido. Los datos parciales se han guardado.",
          variant: "destructive",
        });
        
        setIsLoading(false);
        setProgress(100);
        
        setTimeout(() => {
          navigate("/admin");
        }, 1500);
      }, 240000);

      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            return 85;
          }
          return prev + Math.random() * 2 + 1;
        });
      }, 1500);

      let consecutiveNetworkChecks = 0;
      networkCheckInterval = setInterval(() => {
        fetch('https://www.google.com', { mode: 'no-cors', cache: 'no-store' })
          .catch(() => {
            consecutiveNetworkChecks++;
            if (consecutiveNetworkChecks >= 2) {
              setErrorMessage("Se detectaron problemas de conexión a Internet. Verifica tu conexión.");
            }
          });
      }, 10000);
      
      corsCheckInterval = setInterval(() => {
        if (progress > 80 && corsErrorCount === 0) {
          setCorsErrorCount(prev => prev + 1);
          if (corsErrorCount >= 2) {
            setErrorMessage("El sitio web puede tener protección contra rastreo. Los resultados pueden ser limitados.");
          }
        }
      }, 15000);

      const clearAllIntervals = () => {
        if (progressInterval) clearInterval(progressInterval);
        if (networkCheckInterval) clearInterval(networkCheckInterval);
        if (corsCheckInterval) clearInterval(corsCheckInterval);
        if (globalTimeout) clearTimeout(globalTimeout);
      };

      const scrapingPromise = scrapeProducts(formattedUrl, {
        recursive: true,
        maxDepth: 3,
        includeProductPages: true,
        maxProducts: 15000,
        maxPagesToVisit: 500
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("El rastreo ha excedido el tiempo máximo permitido (3 minutos)"));
        }, 180000);
      });
      
      const result = await Promise.race([scrapingPromise, timeoutPromise]) as any;

      clearAllIntervals();
      
      setProgress(95);

      if (result.success) {
        localStorage.setItem("scraped_products", JSON.stringify(result.products || []));
        localStorage.setItem("scraped_timestamp", result.lastUpdated || new Date().toISOString());
        localStorage.setItem("scraped_url", formattedUrl);
        
        if (result.storeInfo) {
          localStorage.setItem("store_info", JSON.stringify(result.storeInfo));
        }
        
        if (result.contactInfo) {
          localStorage.setItem("contact_info", JSON.stringify(result.contactInfo));
        }

        setProgress(100);

        const productsCount = result.products?.length || 0;
        const totalEstimated = result.totalProductsEstimate || productsCount;
        
        if (productsCount > 0) {
          toast({
            title: "Rastreo completado",
            description: `Se encontraron ${productsCount} productos${result.hasMoreProducts ? ` de aproximadamente ${totalEstimated}` : ''} en ${formattedUrl}`,
          });
        } else {
          toast({
            title: "Rastreo completado",
            description: "No se encontraron productos. Intenta con otra URL o sección de la tienda.",
            variant: "destructive",
          });
        }

        setTimeout(() => {
          navigate("/admin");
        }, 1000);
      } else {
        setProgress(100);
        throw new Error(result.error || "Error desconocido durante el rastreo");
      }
    } catch (error) {
      console.error("Error al rastrear la web:", error);
      
      if (progressInterval) clearInterval(progressInterval);
      if (networkCheckInterval) clearInterval(networkCheckInterval);
      if (corsCheckInterval) clearInterval(corsCheckInterval);
      if (globalTimeout) clearTimeout(globalTimeout);
      
      setProgress(100);
      
      const errorMessage = error instanceof Error ? error.message : "Error desconocido durante el rastreo";
      const isCorsError = errorMessage.includes("CORS") || 
                         errorMessage.includes("origin") || 
                         errorMessage.includes("Todos los métodos de solicitud fallaron");
      
      if (isCorsError) {
        toast({
          title: "Error de acceso al sitio web",
          description: "No se pudo acceder al sitio web debido a restricciones de seguridad. Prueba con otro sitio o sección.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error en el rastreo",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-10">
      <Card className="w-full shadow-lg border-border/50 bg-background/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" />
            Rastreador de Productos Web
          </CardTitle>
          <CardDescription>
            Introduce la URL de una tienda online para extraer todos sus productos y datos
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {errorMessage && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="url" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  URL del sitio web
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Info className="h-4 w-4" />
                        <span className="sr-only">Información</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Introduce la URL principal de la tienda online. 
                        El rastreador visitará automáticamente todas las categorías y páginas de productos.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ejemplo.com/tienda"
                className="w-full"
                required
                disabled={isLoading}
              />
            </div>

            {isLoading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>{progress < 100 ? "Rastreando productos..." : "Procesando resultados..."}</span>
                  <span>{Math.floor(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {progress < 50 
                    ? "Analizando sitio web y estructura de la tienda..."
                    : progress < 85 
                      ? "Extrayendo datos de productos y categorías..."
                      : progress < 95 
                        ? "Procesando datos encontrados..."
                        : "Finalizando el rastreo, por favor espere..."}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Rastreando..." : "Iniciar Rastreo"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center pt-0">
          <p className="text-xs text-muted-foreground text-center">
            Todos los datos se almacenan localmente en tu navegador. 
            Ninguna información se envía a servidores externos.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default WebScraper;
