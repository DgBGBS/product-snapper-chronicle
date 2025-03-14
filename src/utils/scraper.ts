
import { FirecrawlService } from './FirecrawlService';

export interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  imageUrl: string;
  url: string;
  description?: string;
}

export interface ScrapeResult {
  success: boolean;
  error?: string;
  products: Product[];
  lastUpdated: string;
}

/**
 * Fetches and parses product data from the target website
 */
export const scrapeProducts = async (): Promise<ScrapeResult> => {
  try {
    console.log('Starting web scraping from https://profesa.info/tienda');
    
    // Use the FirecrawlService to scrape the website
    const result = await FirecrawlService.crawlWebsite('https://profesa.info/tienda');
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error during scraping');
    }
    
    // Map crawled data to product format
    const products: Product[] = result.data?.data || [];
    
    return {
      success: true,
      products,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error scraping products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during scraping',
      products: [],
      lastUpdated: new Date().toISOString(),
    };
  }
};

/**
 * Extract categories from the product list
 */
export const extractCategories = (products: Product[]): string[] => {
  const categories = new Set<string>();
  
  products.forEach(product => {
    if (product.category) {
      categories.add(product.category);
    }
  });
  
  return Array.from(categories).sort();
};
