
import { FirecrawlService } from './FirecrawlService';

export interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  imageUrl: string;
  url: string;
  description?: string;
  originalPrice?: string;
  discount?: string;
  additionalImages?: string[];
  sku?: string;
  stockStatus?: string;
  rating?: string;
  brand?: string;
  specifications?: Record<string, string>;
  metadata?: Record<string, string>;
  siteSource?: string;
}

export interface StoreInfo {
  name: string;
  url: string;
  categories: string[];
  logo: string;
  description: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

export interface ScrapeResult {
  success: boolean;
  error?: string;
  products: Product[];
  storeInfo?: StoreInfo;
  contactInfo?: ContactInfo;
  lastUpdated: string;
}

/**
 * Fetches and parses product data from the target website
 */
export const scrapeProducts = async (url: string = 'https://profesa.info/tienda'): Promise<ScrapeResult> => {
  try {
    console.log(`Starting enhanced web scraping from ${url}`);
    
    // Use the FirecrawlService to scrape the website
    const result = await FirecrawlService.crawlWebsite(url);
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error during scraping');
    }
    
    // Map crawled data to product format
    const products: Product[] = result.data?.data || [];
    const storeInfo: StoreInfo | undefined = result.data?.storeInfo;
    const contactInfo: ContactInfo | undefined = result.data?.contactInfo;
    
    return {
      success: true,
      products,
      storeInfo,
      contactInfo,
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
