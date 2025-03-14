
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
 * with support for recursive subpage scraping
 */
export const scrapeProducts = async (url: string = 'https://profesa.info/tienda', options = { 
  recursive: true,
  maxDepth: 2,
  includeProductPages: true
}): Promise<ScrapeResult> => {
  try {
    console.log(`Starting enhanced web scraping from ${url} with options:`, options);
    
    const visitedUrls = new Set<string>();
    const allProducts: Product[] = [];
    let storeInfo: StoreInfo | undefined;
    let contactInfo: ContactInfo | undefined;
    
    // Recursive crawler function
    const crawlPage = async (pageUrl: string, depth: number = 0): Promise<void> => {
      // Skip if already visited or max depth reached
      if (visitedUrls.has(pageUrl) || depth > options.maxDepth) {
        return;
      }
      
      visitedUrls.add(pageUrl);
      console.log(`Crawling page at depth ${depth}: ${pageUrl}`);
      
      // Use the FirecrawlService to scrape the website
      const result = await FirecrawlService.crawlWebsite(pageUrl);
      
      if (!result.success) {
        console.error(`Error crawling ${pageUrl}:`, result.error);
        return;
      }
      
      // Extract product data
      const pageProducts: Product[] = result.data?.data || [];
      
      // Save products
      if (pageProducts.length > 0) {
        console.log(`Found ${pageProducts.length} products on ${pageUrl}`);
        allProducts.push(...pageProducts);
      }
      
      // Store store info from the first page only
      if (depth === 0) {
        storeInfo = result.data?.storeInfo;
        contactInfo = result.data?.contactInfo;
      }
      
      // If recursive option is enabled, extract and follow links
      if (options.recursive && depth < options.maxDepth) {
        const links = result.data?.links || [];
        
        // Filter links to follow
        const validLinks = links.filter((link: string) => {
          // Ensure link is from the same domain
          const urlObj = new URL(link);
          const baseUrlObj = new URL(url);
          
          if (urlObj.hostname !== baseUrlObj.hostname) {
            return false;
          }
          
          // Check if it's a product page
          const isProductPage = link.includes('/producto/') || 
                               link.includes('/product/') || 
                               link.includes('/item/') ||
                               link.match(/\/p\/[\w-]+\/?$/);
          
          // Check if it's a category page
          const isCategoryPage = link.includes('/categoria/') || 
                                link.includes('/category/') || 
                                link.includes('/tienda/') ||
                                link.includes('/shop/') ||
                                link.match(/\/c\/[\w-]+\/?$/);
          
          return isCategoryPage || (options.includeProductPages && isProductPage);
        });
        
        console.log(`Found ${validLinks.length} subpages to crawl from ${pageUrl}`);
        
        // Crawl subpages one by one to avoid overwhelming the server
        for (const link of validLinks) {
          if (!visitedUrls.has(link)) {
            // Add a small delay between requests to be considerate
            await new Promise(resolve => setTimeout(resolve, 1000));
            await crawlPage(link, depth + 1);
          }
        }
      }
    };
    
    // Start the recursive crawl from the initial URL
    await crawlPage(url);
    
    // Remove duplicate products based on URL or ID
    const uniqueProducts = Array.from(
      new Map(allProducts.map(product => [product.url || product.id, product])).values()
    );
    
    console.log(`Completed crawling with ${visitedUrls.size} pages visited. Found ${uniqueProducts.length} unique products.`);
    
    return {
      success: true,
      products: uniqueProducts,
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
