
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Globe, Info } from "lucide-react";
import { scrapeProducts } from "@/utils/scraper";
import { toast } from "@/hooks/use-toast";

const WebScraper = () => {
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url) {
      toast({
        title: "Error",
        description: "Por favor, introduce una URL válida",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(10);

    try {
      // Simular progreso mientras se está rastreando
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 1000);

      // Ejecutar el rastreo
      const result = await scrapeProducts(url, {
        recursive: true,
        maxDepth: 3,
        includeProductPages: true,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        // Guardar los resultados en localStorage para que la página de administración los utilice
        localStorage.setItem("scraped_products", JSON.stringify(result.products));
        localStorage.setItem("scraped_timestamp", result.lastUpdated);
        localStorage.setItem("scraped_url", url);
        
        if (result.storeInfo) {
          localStorage.setItem("store_info", JSON.stringify(result.storeInfo));
        }
        
        if (result.contactInfo) {
          localStorage.setItem("contact_info", JSON.stringify(result.contactInfo));
        }

        toast({
          title: "Rastreo completado",
          description: `Se encontraron ${result.products.length} productos en ${url}`,
        });

        // Navegar a la página de administración
        setTimeout(() => {
          navigate("/admin");
        }, 1000);
      } else {
        throw new Error(result.error || "Error desconocido durante el rastreo");
      }
    } catch (error) {
      console.error("Error al rastrear la web:", error);
      toast({
        title: "Error",
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
                type="url"
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
                  <span>Rastreando productos...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Este proceso puede tardar varios minutos dependiendo del tamaño del sitio web.
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
