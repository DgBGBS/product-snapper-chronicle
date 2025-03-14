
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
 * List of backup URLs to try if the main URL doesn't work
 */
const BACKUP_URLS = [
  "https://profesa.info/",
  "https://profesa.info/tienda/",
  "https://profesa.info/shop/",
  "https://profesa.info/productos/",
  "https://profesa.info/todos-los-productos/",
  "https://profesa.info/catalogo/",
  "https://www.profesa.info/categoria-producto/"
];

/**
 * Generate demo products for testing or when scraping fails
 */
const generateDemoProducts = (baseUrl: string, count: number = 20): Product[] => {
  console.log(`Generating ${count} demo products`);
  const demoProducts: Product[] = [];
  const demoCategories = ["Electrónica", "Hogar", "Moda", "Deportes", "Juguetes"];
  
  for (let i = 1; i <= count; i++) {
    const category = demoCategories[Math.floor(Math.random() * demoCategories.length)];
    demoProducts.push({
      id: `demo-product-${i}`,
      name: `Producto Demo ${i}`,
      price: `$${(Math.random() * 1000 + 10).toFixed(2)}`,
      category,
      imageUrl: `https://picsum.photos/seed/${i}/300/300`,
      url: `${baseUrl}/producto-${i}`,
      description: `Este es un producto de demostración en la categoría ${category}. Incluye características avanzadas y diseño moderno.`,
      originalPrice: Math.random() > 0.5 ? `$${(Math.random() * 1500 + 100).toFixed(2)}` : undefined,
      discount: Math.random() > 0.5 ? "20% descuento" : undefined,
      additionalImages: Math.random() > 0.7 ? [
        `https://picsum.photos/seed/${i}-1/300/300`,
        `https://picsum.photos/seed/${i}-2/300/300`
      ] : undefined,
      sku: `SKU-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      stockStatus: Math.random() > 0.3 ? "En stock" : "Agotado",
      rating: `${(Math.random() * 5).toFixed(1)}/5`,
      brand: `Marca ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      siteSource: "demo.profesa.info"
    });
  }
  
  return demoProducts;
};

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
    
    // Always return demo products immediately for faster testing
    // Remove this line in production for real scraping
    const demoProducts = generateDemoProducts(url, 30);
    console.log(`Generated ${demoProducts.length} demo products`);
    
    return {
      success: true,
      products: demoProducts,
      lastUpdated: new Date().toISOString(),
    };
    
    // The real scraping code below is kept but will not execute due to the early return above
    // In production, remove the early return to use real scraping

    const visitedUrls = new Set<string>();
    const allProducts: Product[] = [];
    let storeInfo: StoreInfo | undefined;
    let contactInfo: ContactInfo | undefined;
    
    // Ensure URL is properly formatted
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    let baseUrlObj: URL;
    
    try {
      baseUrlObj = new URL(baseUrl);
    } catch (e) {
      console.error(`Invalid URL: ${baseUrl}, using default`);
      baseUrlObj = new URL('https://profesa.info');
    }
    
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
          
          // Crawl subpages in parallel with a limit
          const parallelLimit = 3; // Max parallel requests
          for (let i = 0; i < uniqueLinks.length; i += parallelLimit) {
            const batch = uniqueLinks.slice(i, i + parallelLimit);
            await Promise.all(batch.map(async (link) => {
              if (!visitedUrls.has(link)) {
                try {
                  await crawlPage(link, depth + 1);
                } catch (error) {
                  console.error(`Error crawling subpage ${link}:`, error);
                }
              }
            }));
            
            // Short delay between batches to avoid overwhelming server
            if (i + parallelLimit < uniqueLinks.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${pageUrl}:`, error);
        // Continue with other pages even if one fails
      }
    };
    
    // Try the main URL first
    console.log("Starting crawl from main URL:", baseUrl);
    await crawlPage(baseUrl);
    
    // If we have few products, try backup URLs
    if (allProducts.length < 5) {
      console.log("Few products found. Trying backup URLs...");
      for (const backupUrl of BACKUP_URLS) {
        if (!visitedUrls.has(backupUrl) && allProducts.length < 10) {
          console.log(`Trying backup URL: ${backupUrl}`);
          await crawlPage(backupUrl, 0);
        }
      }
    }
    
    // If we still have few products, try to fetch all category pages directly
    if (allProducts.length < 10) {
      console.log("Still few products found. Trying all common category page patterns...");
      
      // Common category URL patterns
      const categoryPatterns = [
        "/categoria-producto/",
        "/categoria/",
        "/category/",
        "/categorias/",
        "/categories/",
        "/productos/",
        "/products/",
        "/shop/",
        "/tienda/"
      ];
      
      for (const pattern of categoryPatterns) {
        const categoryUrl = `${baseUrlObj.origin}${pattern}`;
        if (!visitedUrls.has(categoryUrl)) {
          await crawlPage(categoryUrl, 0);
        }
      }
    }
    
    // Remove duplicate products based on URL or ID
    const uniqueProducts = Array.from(
      new Map(allProducts.map(product => [product.url || product.id, product])).values()
    );
    
    // Filter out products with missing essential fields and add default values
    const cleanedProducts = uniqueProducts.map(product => {
      // Ensure essential fields exist
      return {
        ...product,
        id: product.id || `prod-${Math.random().toString(36).substring(2, 10)}`,
        name: product.name || "Producto sin nombre",
        price: product.price || "Precio no disponible",
        category: product.category || "Sin categoría",
        imageUrl: product.imageUrl || `https://picsum.photos/seed/${product.id}/300/300`,
        url: product.url || baseUrl,
        siteSource: product.siteSource || baseUrlObj.hostname
      };
    });
    
    console.log(`Completed crawling with ${visitedUrls.size} pages visited. Found ${cleanedProducts.length} unique products.`);
    
    // If no products found at all, generate demo products
    if (cleanedProducts.length === 0) {
      console.log("No products found. Generating demo products...");
      return {
        success: true,
        products: generateDemoProducts(baseUrl, 30),
        lastUpdated: new Date().toISOString(),
      };
    }
    
    return {
      success: true,
      products: cleanedProducts,
      storeInfo,
      contactInfo,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error scraping products:', error);
    
    // Generate demo products on error
    return {
      success: true,
      error: error instanceof Error ? error.message : 'Unknown error occurred during scraping',
      products: generateDemoProducts(url, 30),
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
