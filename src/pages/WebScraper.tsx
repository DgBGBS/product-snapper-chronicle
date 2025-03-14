
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
  const navigate = useNavigate();

  // Función para validar URL
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    // Validar URL
    if (!url) {
      toast({
        title: "Error",
        description: "Por favor, introduce una URL válida",
        variant: "destructive",
      });
      return;
    }

    // Asegurar que la URL tiene formato correcto
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

    // Crear dos controladores de intervalos separados para mayor fiabilidad
    let progressInterval: NodeJS.Timeout | null = null;
    let networkCheckInterval: NodeJS.Timeout | null = null;
    
    try {
      // Control de progreso principal
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval!);
            return 85;
          }
          return prev + 3;
        });
      }, 1000);

      // Comprobación periódica de conectividad
      let consecutiveNetworkChecks = 0;
      networkCheckInterval = setInterval(() => {
        fetch('https://www.google.com', { mode: 'no-cors', cache: 'no-store' })
          .catch(() => {
            consecutiveNetworkChecks++;
            if (consecutiveNetworkChecks >= 3) {
              setErrorMessage("Se detectaron problemas de conexión. Es posible que los resultados sean limitados.");
            }
          });
      }, 10000);

      // Ejecutar el rastreo con timeout para evitar bloqueos indefinidos
      const scrapingPromise = scrapeProducts(formattedUrl, {
        recursive: true,
        maxDepth: 3,
        includeProductPages: true,
      });
      
      // Establecer un tiempo límite para el rastreo (3 minutos)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("El rastreo ha excedido el tiempo máximo permitido (3 minutos)"));
        }, 180000); // 3 minutos en milisegundos
      });
      
      // Usar Promise.race para que se resuelva con el primero que termine
      const result = await Promise.race([scrapingPromise, timeoutPromise]) as any;

      // Limpiar los intervalos
      if (progressInterval) clearInterval(progressInterval);
      if (networkCheckInterval) clearInterval(networkCheckInterval);
      
      // Avanzar al 95% antes de procesar resultados
      setProgress(95);

      if (result.success) {
        // Guardar los resultados en localStorage para que la página de administración los utilice
        localStorage.setItem("scraped_products", JSON.stringify(result.products || []));
        localStorage.setItem("scraped_timestamp", result.lastUpdated || new Date().toISOString());
        localStorage.setItem("scraped_url", formattedUrl);
        
        if (result.storeInfo) {
          localStorage.setItem("store_info", JSON.stringify(result.storeInfo));
        }
        
        if (result.contactInfo) {
          localStorage.setItem("contact_info", JSON.stringify(result.contactInfo));
        }

        // Completar el progreso al 100%
        setProgress(100);

        const productsCount = result.products?.length || 0;
        
        if (productsCount > 0) {
          toast({
            title: "Rastreo completado",
            description: `Se encontraron ${productsCount} productos en ${formattedUrl}`,
          });
        } else {
          toast({
            title: "Rastreo completado",
            description: "No se encontraron productos. Intenta con otra URL o sección de la tienda.",
            variant: "destructive",
          });
        }

        // Navegar a la página de administración
        setTimeout(() => {
          navigate("/admin");
        }, 1000);
      } else {
        setProgress(100); // Completar el progreso aunque haya error
        throw new Error(result.error || "Error desconocido durante el rastreo");
      }
    } catch (error) {
      console.error("Error al rastrear la web:", error);
      
      // Limpiar los intervalos si aún existen
      if (progressInterval) clearInterval(progressInterval);
      if (networkCheckInterval) clearInterval(networkCheckInterval);
      
      // Asegurar que el progreso llegue al 100% incluso con error
      setProgress(100);
      
      toast({
        title: "Error en el rastreo",
        description: error instanceof Error ? error.message : "Error desconocido durante el rastreo",
        variant: "destructive",
      });
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
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {progress < 85 
                    ? "Analizando sitio web y extrayendo datos de productos..."
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
