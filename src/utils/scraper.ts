
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
    
    // Ensure URL is properly formatted
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const baseUrlObj = new URL(baseUrl);
    
    // Recursive crawler function
    const crawlPage = async (pageUrl: string, depth: number = 0): Promise<void> => {
      // Skip if already visited or max depth reached
      if (visitedUrls.has(pageUrl) || depth > options.maxDepth) {
        return;
      }
      
      // Check if URL is valid
      try {
        new URL(pageUrl);
      } catch (e) {
        console.error(`Invalid URL: ${pageUrl}`);
        return;
      }
      
      visitedUrls.add(pageUrl);
      console.log(`Crawling page at depth ${depth}: ${pageUrl}`);
      
      try {
        // Use the FirecrawlService to scrape the website
        const result = await FirecrawlService.crawlWebsite(pageUrl);
        
        if (!result.success) {
          console.error(`Error crawling ${pageUrl}:`, result.error);
          return;
        }
        
        // Extract product data
        const pageProducts: Product[] = result.data?.data || [];
        
        // Make sure products have IDs and URLs
        const processedProducts = pageProducts.map(product => ({
          ...product,
          id: product.id || `prod-${Math.random().toString(36).substring(2, 9)}`,
          url: product.url || pageUrl
        }));
        
        // Save products
        if (processedProducts.length > 0) {
          console.log(`Found ${processedProducts.length} products on ${pageUrl}`);
          allProducts.push(...processedProducts);
        }
        
        // Store store info from the first page only
        if (depth === 0 && result.data?.storeInfo) {
          storeInfo = result.data.storeInfo;
        }
        
        // Store contact info from the first page only
        if (depth === 0 && result.data?.contactInfo) {
          contactInfo = result.data.contactInfo;
        }
        
        // If recursive option is enabled, extract and follow links
        if (options.recursive && depth < options.maxDepth) {
          const linksData = result.data?.links || [];
          
          // Filter links to follow - ensure they are all strings
          const validLinks: string[] = [];
          
          for (const link of linksData) {
            // Skip if link is not a string
            if (typeof link !== 'string') {
              continue;
            }
            
            try {
              // Ensure link is valid
              const linkUrl = new URL(link);
              
              // Ensure link is from the same domain
              if (linkUrl.hostname !== baseUrlObj.hostname) {
                continue;
              }
              
              // Normalize the URL (remove trailing slashes, query params, etc)
              const normalizedLink = `${linkUrl.protocol}//${linkUrl.hostname}${linkUrl.pathname}`;
              
              // Check if it's a product page
              const isProductPage = normalizedLink.includes('/producto/') || 
                               normalizedLink.includes('/product/') || 
                               normalizedLink.includes('/item/') ||
                               normalizedLink.match(/\/p\/[\w-]+\/?$/);
              
              // Check if it's a category page
              const isCategoryPage = normalizedLink.includes('/categoria/') || 
                                normalizedLink.includes('/category/') || 
                                normalizedLink.includes('/tienda/') ||
                                normalizedLink.includes('/shop/') ||
                                normalizedLink.match(/\/c\/[\w-]+\/?$/);
              
              // Check if we should visit this link
              if (isCategoryPage || (options.includeProductPages && isProductPage)) {
                validLinks.push(link);
              }
            } catch (e) {
              console.error(`Invalid link: ${link}`);
            }
          }
          
          const uniqueLinks = [...new Set(validLinks)]; // Remove duplicates
          console.log(`Found ${uniqueLinks.length} subpages to crawl from ${pageUrl}`);
          
          // Crawl subpages one by one to avoid overwhelming the server
          for (const link of uniqueLinks) {
            if (!visitedUrls.has(link)) {
              // Add a small delay between requests to be considerate
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                await crawlPage(link, depth + 1);
              } catch (error) {
                console.error(`Error crawling subpage ${link}:`, error);
                // Continue with other links even if one fails
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${pageUrl}:`, error);
        // Continue with other pages even if one fails
      }
    };
    
    // Start the recursive crawl from the initial URL
    await crawlPage(baseUrl);
    
    // Remove duplicate products based on URL or ID
    const uniqueProducts = Array.from(
      new Map(allProducts.map(product => [product.url || product.id, product])).values()
    );
    
    // Add site source to products
    const finalProducts = uniqueProducts.map(product => ({
      ...product,
      siteSource: baseUrlObj.hostname
    }));
    
    console.log(`Completed crawling with ${visitedUrls.size} pages visited. Found ${finalProducts.length} unique products.`);
    
    // If no products found or very few, try direct scraping of the main product page
    if (finalProducts.length < 3 && options.includeProductPages) {
      console.log("Few or no products found via recursive crawling. Trying direct product page.");
      const productPageUrl = `${baseUrl.replace(/\/tienda\/?$/, '')}/producto/`;
      
      try {
        const result = await FirecrawlService.crawlWebsite(productPageUrl);
        if (result.success && result.data?.data?.length > 0) {
          console.log(`Found ${result.data.data.length} products on ${productPageUrl}`);
          
          // Process and add these products
          const directProducts = result.data.data.map((product: Product) => ({
            ...product,
            id: product.id || `prod-${Math.random().toString(36).substring(2, 9)}`,
            url: product.url || productPageUrl,
            siteSource: baseUrlObj.hostname
          }));
          
          // Add only products that don't already exist
          const existingIds = new Set(finalProducts.map(p => p.id));
          const newProducts = directProducts.filter(p => !existingIds.has(p.id));
          
          if (newProducts.length > 0) {
            console.log(`Adding ${newProducts.length} new products from direct scraping`);
            finalProducts.push(...newProducts);
          }
        }
      } catch (error) {
        console.error(`Error with direct product page scraping:`, error);
      }
    }
    
    // Try another backup approach if still no products
    if (finalProducts.length === 0) {
      try {
        console.log("Trying alternative scraping approach with /productos/ URL");
        const productosUrl = `${baseUrl.replace(/\/tienda\/?$/, '')}/productos/`;
        const result = await FirecrawlService.crawlWebsite(productosUrl);
        
        if (result.success && result.data?.data?.length > 0) {
          console.log(`Found ${result.data.data.length} products on ${productosUrl}`);
          
          const backupProducts = result.data.data.map((product: Product) => ({
            ...product,
            id: product.id || `prod-${Math.random().toString(36).substring(2, 9)}`,
            url: product.url || productosUrl,
            siteSource: baseUrlObj.hostname
          }));
          
          finalProducts.push(...backupProducts);
        }
      } catch (error) {
        console.error("Error with backup scraping approach:", error);
      }
    }
    
    return {
      success: true,
      products: finalProducts,
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
