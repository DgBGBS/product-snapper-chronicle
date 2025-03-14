
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { scrapeProducts, type Product, type ScrapeResult } from '@/utils/scraper';
import { saveToGoogleSheets, setupScheduledTask } from '@/utils/storage';

interface DataExtractorProps {
  onDataFetched: (data: Product[], lastUpdated: string) => void;
  autoFetchInterval?: number; // in seconds
}

const DataExtractor = ({ 
  onDataFetched, 
  autoFetchInterval = 30
}: DataExtractorProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>('https://profesa.info/tienda');
  const [updateInterval, setUpdateInterval] = useState<string>(autoFetchInterval.toString());
  const [isRealtime, setIsRealtime] = useState<boolean>(false);
  const fetchingRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  
  // Cargar datos de localStorage al inicio
  useEffect(() => {
    const savedData = localStorage.getItem('scraped_products');
    const savedTimestamp = localStorage.getItem('scraped_timestamp');
    
    if (savedData && savedTimestamp) {
      try {
        const parsedData = JSON.parse(savedData) as Product[];
        console.log('Cargando datos guardados:', parsedData.length, 'productos');
        onDataFetched(parsedData, savedTimestamp);
        setLastUpdated(savedTimestamp);
      } catch (e) {
        console.error('Error al cargar datos guardados:', e);
      }
    }
  }, [onDataFetched]);
  
  // Function to fetch data
  const fetchData = useCallback(async (url?: string) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log('Fetch already in progress, skipping');
      return;
    }
    
    const targetSiteUrl = url || targetUrl;
    
    fetchingRef.current = true;
    setIsLoading(true);
    setProgress(20);
    
    try {
      // Simulate progress updates during fetch
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 70));
      }, 300);
      
      // Log start of scraping
      console.log(`Starting to scrape products from ${targetSiteUrl}`);
      
      // Fetch data
      const result: ScrapeResult = await scrapeProducts(targetSiteUrl);
      clearInterval(progressInterval);
      
      if (result.success) {
        setProgress(80);
        console.log(`Successfully scraped ${result.products.length} products from ${targetSiteUrl}`);
        
        // Enhanced data logging
        if (result.storeInfo) {
          console.log('Store info:', result.storeInfo);
        }
        
        if (result.contactInfo) {
          console.log('Contact info:', result.contactInfo);
        }
        
        // Save products to localStorage for the detail page to access
        localStorage.setItem('scraped_products', JSON.stringify(result.products));
        localStorage.setItem('scraped_timestamp', result.lastUpdated);
        
        // Save store info if available
        if (result.storeInfo) {
          localStorage.setItem('store_info', JSON.stringify(result.storeInfo));
        }
        
        // Save contact info if available
        if (result.contactInfo) {
          localStorage.setItem('contact_info', JSON.stringify(result.contactInfo));
        }
        
        console.log('Products and additional data saved to localStorage');
        
        // Save to Google Sheets
        await saveToGoogleSheets(result.products);
        setProgress(100);
        
        // Update state
        setLastUpdated(result.lastUpdated);
        
        // Pass data to parent component
        console.log('DataExtractor: Passing', result.products.length, 'products to parent');
        onDataFetched(result.products, result.lastUpdated);
        
        toast({
          title: "Datos actualizados",
          description: `Se actualizaron ${result.products.length} productos de ${targetSiteUrl}`,
        });
      } else {
        setProgress(100);
        throw new Error(result.error || "Error desconocido al obtener datos");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 1000);
      fetchingRef.current = false;
    }
  }, [onDataFetched, toast, targetUrl]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUrl) {
      fetchData(targetUrl);
    }
  };
  
  // Handle interval change
  const handleIntervalChange = (value: string) => {
    setUpdateInterval(value);
    if (isRealtime) {
      // Restart interval with new value
      setupRealtimeUpdates(parseInt(value, 10));
    }
  };
  
  // Setup real-time updates
  const setupRealtimeUpdates = useCallback((seconds: number) => {
    // Clear existing interval if any
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log("Cleared existing update interval");
    }
    
    // Set up new interval
    if (isRealtime) {
      console.log(`Setting up real-time updates every ${seconds} seconds`);
      intervalRef.current = window.setInterval(() => {
        console.log(`Running real-time update (interval: ${seconds} seconds)`);
        fetchData();
      }, seconds * 1000);
    }
    
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("Cleared real-time update interval");
      }
    };
  }, [fetchData, isRealtime]);
  
  // Handle real-time toggle
  const handleRealtimeToggle = (checked: boolean) => {
    setIsRealtime(checked);
    if (checked) {
      toast({
        title: "Modo en tiempo real activado",
        description: `Los datos se actualizarán cada ${updateInterval} segundos`,
      });
      setupRealtimeUpdates(parseInt(updateInterval, 10));
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        toast({
          title: "Modo en tiempo real desactivado",
          description: "Los datos se actualizarán solo manualmente",
        });
      }
    }
  };
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        console.log("Cleanup: cleared real-time update interval");
      }
    };
  }, []);
  
  // First load data fetch
  useEffect(() => {
    const initialFetch = async () => {
      await fetchData();
    };
    
    initialFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Setup scheduled task only if not in real-time mode
  useEffect(() => {
    if (!isRealtime) {
      console.log(`Setting up scheduled task to run every ${autoFetchInterval} minutes`);
      const cleanup = setupScheduledTask(
        () => fetchData(),
        autoFetchInterval,
        true
      );
      
      return () => {
        cleanup();
      };
    }
    return undefined;
  }, [fetchData, autoFetchInterval, isRealtime]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Extractor de Datos</h2>
          <p className="text-sm text-muted-foreground">
            Extrae datos de productos desde sitios web de e-commerce
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="url"
          placeholder="URL del sitio web (ej: https://tienda.com)"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          className="flex-grow"
          required
        />
        
        <Button
          type="submit"
          disabled={isLoading}
          className="transition-all duration-300"
        >
          {isLoading ? "Extrayendo..." : "Extraer Ahora"}
        </Button>
      </form>
      
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center space-x-2">
          <Switch
            id="real-time-mode"
            checked={isRealtime}
            onCheckedChange={handleRealtimeToggle}
          />
          <Label htmlFor="real-time-mode">Actualización en tiempo real</Label>
        </div>
        
        {isRealtime && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="update-interval">Frecuencia:</Label>
            <Select
              value={updateInterval}
              onValueChange={handleIntervalChange}
              disabled={!isRealtime}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar intervalo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Cada 5 segundos</SelectItem>
                <SelectItem value="10">Cada 10 segundos</SelectItem>
                <SelectItem value="30">Cada 30 segundos</SelectItem>
                <SelectItem value="60">Cada 1 minuto</SelectItem>
                <SelectItem value="300">Cada 5 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {(isLoading || progress > 0) && (
        <Progress 
          value={progress} 
          className="h-2 transition-all" 
        />
      )}
      
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Última actualización: {new Date(lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default DataExtractor;
