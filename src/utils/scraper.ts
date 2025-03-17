import { FirecrawlService } from './FirecrawlService';

export interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  subcategory?: string;
  path?: string;
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
  ean?: string;
  code?: string;
  barcode?: string;
  weight?: string;
  dimensions?: string;
  availability?: string;
  manufacturerCode?: string;
}

export interface StoreInfo {
  name: string;
  url: string;
  categories: string[];
  subcategories?: Record<string, string[]>;
  logo: string;
  description: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

export interface ScrapeOptions {
  recursive: boolean;
  maxDepth: number;
  includeProductPages: boolean;
  maxProducts: number;
  maxPagesToVisit: number;
  includeSubdomains: boolean;
  detectCategories: boolean;
  auth?: {
    username: string;
    password: string;
  };
}

export interface ScrapeResult {
  success: boolean;
  error?: string;
  products: Product[];
  storeInfo?: StoreInfo;
  contactInfo?: ContactInfo;
  lastUpdated: string;
  totalProductsEstimate?: number;
  hasMoreProducts?: boolean;
}

export const scrapeProducts = async (url: string, options: ScrapeOptions = { 
  recursive: true,
  maxDepth: 10,
  includeProductPages: true,
  maxProducts: 50000,
  maxPagesToVisit: 1000,
  includeSubdomains: true,
  detectCategories: true,
  auth: undefined
}): Promise<ScrapeResult> => {
  try {
    console.log(`Iniciando rastreo web desde ${url} con opciones:`, options);
    
    const visitedUrls = new Set<string>();
    const allProducts: Product[] = [];
    const categories = new Map<string, Set<string>>();
    let storeInfo: StoreInfo | undefined;
    let contactInfo: ContactInfo | undefined;
    let hasMoreProducts = false;
    
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    let baseUrlObj: URL;
    
    try {
      baseUrlObj = new URL(baseUrl);
    } catch (e) {
      console.error(`URL inválida: ${baseUrl}, intentando corregir`);
      try {
        baseUrlObj = new URL(`https://${baseUrl}`);
      } catch (e) {
        return {
          success: false,
          error: `URL inválida: ${baseUrl}. Debe ser una URL válida como 'https://ejemplo.com'`,
          products: [],
          lastUpdated: new Date().toISOString(),
        };
      }
    }
    
    const isSameDomain = (urlToCheck: string): boolean => {
      try {
        const checkUrl = new URL(urlToCheck);
        return options.includeSubdomains
          ? checkUrl.hostname.endsWith(baseUrlObj.hostname)
          : checkUrl.hostname === baseUrlObj.hostname;
      } catch (e) {
        return false;
      }
    };
    
    const crawlOptions: any = options.auth ? { auth: options.auth } : {};
    const crawlPromise = FirecrawlService.crawlWebsite(baseUrl, crawlOptions);
    const result = await crawlPromise;
    
    if (!result.success) {
      console.error(`Error rastreando ${baseUrl}:`, result.error);
      return {
        success: false,
        error: result.error,
        products: [],
        lastUpdated: new Date().toISOString(),
      };
    }
    
    for (const pageData of result.data?.pages || []) {
      for (const product of pageData.products || []) {
        if (options.detectCategories) {
          const pathSegments = new URL(product.url).pathname.split('/').filter(Boolean);
          if (pathSegments.length >= 2) {
            const category = pathSegments[pathSegments.length - 2];
            const subcategory = pathSegments[pathSegments.length - 1];
            product.category = category;
            product.subcategory = subcategory;
            product.path = pathSegments.join('/');
            if (!categories.has(category)) {
              categories.set(category, new Set());
            }
            categories.get(category)!.add(subcategory);
          }
        }
        allProducts.push(product);
      }
    }
    
    return {
      success: true,
      products: allProducts,
      storeInfo: {
        ...result.data?.storeInfo,
        categories: Array.from(categories.keys()),
        subcategories: Object.fromEntries(
          Array.from(categories.entries()).map(([cat, subs]) => [cat, Array.from(subs)])
        )
      },
      contactInfo: result.data?.contactInfo,
      lastUpdated: new Date().toISOString(),
      totalProductsEstimate: hasMoreProducts ? allProducts.length * 10 : allProducts.length,
      hasMoreProducts
    };
  } catch (error) {
    console.error('Error rastreando productos:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ocurrió un error desconocido durante el rastreo',
      products: [],
      lastUpdated: new Date().toISOString(),
    };
  }
};
