
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { scrapeProducts, type Product, type ScrapeResult } from '@/utils/scraper';
import { saveToGoogleSheets, setupScheduledTask } from '@/utils/storage';

interface DataExtractorProps {
  onDataFetched: (data: Product[], lastUpdated: string) => void;
  autoFetchInterval?: number; // in minutes
}

const DataExtractor = ({ 
  onDataFetched, 
  autoFetchInterval = 30
}: DataExtractorProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  
  // Function to fetch data
  const fetchData = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log('Fetch already in progress, skipping');
      return;
    }
    
    fetchingRef.current = true;
    setIsLoading(true);
    setProgress(20);
    
    try {
      // Simulate progress updates during fetch
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 70));
      }, 300);
      
      // Log start of scraping
      console.log('Starting to scrape products from profesa.info/tienda');
      
      // Fetch data
      const result: ScrapeResult = await scrapeProducts();
      clearInterval(progressInterval);
      
      if (result.success) {
        setProgress(80);
        console.log(`Successfully scraped ${result.products.length} products`);
        
        // Save to Google Sheets
        const storageResult = await saveToGoogleSheets(result.products);
        setProgress(100);
        
        // Update state
        setLastUpdated(result.lastUpdated);
        
        // Pass data to parent component
        console.log('DataExtractor: Passing', result.products.length, 'products to parent');
        onDataFetched(result.products, result.lastUpdated);
        
        toast({
          title: "Datos actualizados",
          description: `Se actualizaron ${result.products.length} productos de profesa.info/tienda`,
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
  }, [onDataFetched, toast]);
  
  // First load data fetch
  useEffect(() => {
    const initialFetch = async () => {
      await fetchData();
    };
    
    initialFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Setup scheduled task
  useEffect(() => {
    console.log(`Setting up scheduled task to run every ${autoFetchInterval} minutes`);
    const cleanup = setupScheduledTask(
      fetchData,
      autoFetchInterval,
      true
    );
    
    return () => {
      cleanup();
    };
  }, [fetchData, autoFetchInterval]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Extractor de Datos</h2>
          <p className="text-sm text-muted-foreground">
            Extrae datos de productos desde <a href="https://profesa.info/tienda" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">profesa.info/tienda</a> cada {autoFetchInterval} minutos
          </p>
        </div>
        
        <Button
          onClick={fetchData}
          disabled={isLoading}
          className="transition-all duration-300"
        >
          {isLoading ? "Extrayendo..." : "Extraer Ahora"}
        </Button>
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
