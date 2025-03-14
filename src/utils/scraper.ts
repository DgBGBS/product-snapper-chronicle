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
export const scrapeProducts = async (url: string = 'https://profesa.info/categoria-producto/', options = { 
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
                                normalizedLink.includes('/categoria-producto/') || 
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
    
    // Start with the main category page URL
    console.log("Starting crawl from main category page:", baseUrl);
    await crawlPage(baseUrl);
    
    // If we have few or no products, try to fetch all category pages directly
    if (allProducts.length < 10) {
      console.log("Few products found. Trying to fetch all category pages directly...");
      try {
        // First, check the main categories page
        const result = await FirecrawlService.crawlWebsite(`${baseUrlObj.origin}/categoria-producto/`);
        
        if (result.success && result.data?.links) {
          // Find all category links
          const categoryLinks: string[] = [];
          
          for (const link of result.data.links) {
            if (typeof link === 'string' && 
                link.includes('/categoria-producto/') && 
                !link.includes('/page/') && 
                link !== `${baseUrlObj.origin}/categoria-producto/`) {
              categoryLinks.push(link);
            }
          }
          
          console.log(`Found ${categoryLinks.length} category pages to crawl directly`);
          
          // Crawl each category page
          for (const categoryLink of categoryLinks) {
            if (!visitedUrls.has(categoryLink)) {
              console.log(`Crawling category page: ${categoryLink}`);
              await crawlPage(categoryLink, 0); // Reset depth for category pages
              
              // Also check for pagination on this category
              try {
                const catResult = await FirecrawlService.crawlWebsite(categoryLink);
                if (catResult.success && catResult.data?.links) {
                  const paginationLinks = (catResult.data.links as string[])
                    .filter(link => 
                      typeof link === 'string' && 
                      link.includes(categoryLink) && 
                      link.includes('/page/')
                    );
                  
                  console.log(`Found ${paginationLinks.length} pagination links for category ${categoryLink}`);
                  
                  for (const pageLink of paginationLinks) {
                    if (!visitedUrls.has(pageLink)) {
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      await crawlPage(pageLink, 0);
                    }
                  }
                }
              } catch (error) {
                console.error(`Error processing category pagination: ${categoryLink}`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching all categories:", error);
      }
    }
    
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
    
    // If still very few products, try other approaches
    if (finalProducts.length < 5) {
      console.log("Very few products found. Trying additional methods...");
      
      // Try specific product listing URLs
      const additionalUrls = [
        `${baseUrlObj.origin}/productos/`,
        `${baseUrlObj.origin}/tienda/`,
        `${baseUrlObj.origin}/shop/`,
        `${baseUrlObj.origin}/todos-los-productos/`
      ];
      
      for (const additionalUrl of additionalUrls) {
        if (!visitedUrls.has(additionalUrl)) {
          try {
            console.log(`Trying additional URL: ${additionalUrl}`);
            await crawlPage(additionalUrl, 0);
          } catch (error) {
            console.error(`Error with additional URL ${additionalUrl}:`, error);
          }
        }
      }
    }
    
    // Final processing - ensure we have unique products
    const finalUniqueProducts = Array.from(
      new Map(allProducts.map(product => [product.url || product.id, product])).values()
    ).map(product => ({
      ...product,
      siteSource: baseUrlObj.hostname
    }));
    
    return {
      success: true,
      products: finalUniqueProducts,
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
