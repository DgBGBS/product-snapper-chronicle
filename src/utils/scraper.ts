
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
 * Lista de URLs de respaldo para probar si la URL principal no funciona
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
 * Extrae y analiza datos de productos del sitio web objetivo
 * con soporte para rastreo recursivo de subpáginas
 */
export const scrapeProducts = async (url: string = 'https://profesa.info/categoria-producto/', options = { 
  recursive: true,
  maxDepth: 2,
  includeProductPages: true
}): Promise<ScrapeResult> => {
  try {
    console.log(`Iniciando rastreo web mejorado desde ${url} con opciones:`, options);
    
    const visitedUrls = new Set<string>();
    const allProducts: Product[] = [];
    let storeInfo: StoreInfo | undefined;
    let contactInfo: ContactInfo | undefined;
    
    // Asegurar que la URL esté formateada correctamente
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    let baseUrlObj: URL;
    
    try {
      baseUrlObj = new URL(baseUrl);
    } catch (e) {
      console.error(`URL inválida: ${baseUrl}, usando predeterminada`);
      baseUrlObj = new URL('https://profesa.info');
    }
    
    // Función de rastreo recursiva
    const crawlPage = async (pageUrl: string, depth: number = 0): Promise<void> => {
      // Saltar si ya visitada o máxima profundidad alcanzada
      if (visitedUrls.has(pageUrl) || depth > options.maxDepth) {
        return;
      }
      
      // Verificar si la URL es válida
      try {
        new URL(pageUrl);
      } catch (e) {
        console.error(`URL inválida: ${pageUrl}`);
        return;
      }
      
      visitedUrls.add(pageUrl);
      console.log(`Rastreando página a profundidad ${depth}: ${pageUrl}`);
      
      try {
        // Usar FirecrawlService para rastrear el sitio web
        const result = await FirecrawlService.crawlWebsite(pageUrl);
        
        if (!result.success) {
          console.error(`Error rastreando ${pageUrl}:`, result.error);
          return;
        }
        
        // Extraer datos de productos
        const pageProducts: Product[] = result.data?.data || [];
        
        // Asegurar que los productos tengan IDs y URLs
        const processedProducts = pageProducts.map(product => ({
          ...product,
          id: product.id || `prod-${Math.random().toString(36).substring(2, 9)}`,
          url: product.url || pageUrl
        }));
        
        // Guardar productos
        if (processedProducts.length > 0) {
          console.log(`Se encontraron ${processedProducts.length} productos en ${pageUrl}`);
          allProducts.push(...processedProducts);
        }
        
        // Almacenar información de la tienda solo desde la primera página
        if (depth === 0 && result.data?.storeInfo) {
          storeInfo = result.data.storeInfo;
        }
        
        // Almacenar información de contacto solo desde la primera página
        if (depth === 0 && result.data?.contactInfo) {
          contactInfo = result.data.contactInfo;
        }
        
        // Si la opción recursiva está habilitada, extraer y seguir enlaces
        if (options.recursive && depth < options.maxDepth) {
          const linksData = result.data?.links || [];
          
          // Filtrar enlaces a seguir - asegurar que todos sean strings
          const validLinks: string[] = [];
          
          for (const link of linksData) {
            // Saltar si el enlace no es un string
            if (typeof link !== 'string') {
              continue;
            }
            
            try {
              // Asegurar que el enlace sea válido
              const linkUrl = new URL(link);
              
              // Asegurar que el enlace sea del mismo dominio
              if (linkUrl.hostname !== baseUrlObj.hostname) {
                continue;
              }
              
              // Normalizar la URL (eliminar barras finales, parámetros de consulta, etc.)
              const normalizedLink = `${linkUrl.protocol}//${linkUrl.hostname}${linkUrl.pathname}`;
              
              // Verificar si es una página de producto
              const isProductPage = normalizedLink.includes('/producto/') || 
                               normalizedLink.includes('/product/') || 
                               normalizedLink.includes('/item/') ||
                               normalizedLink.match(/\/p\/[\w-]+\/?$/);
              
              // Verificar si es una página de categoría
              const isCategoryPage = normalizedLink.includes('/categoria/') || 
                                normalizedLink.includes('/categoria-producto/') || 
                                normalizedLink.includes('/category/') || 
                                normalizedLink.includes('/tienda/') ||
                                normalizedLink.includes('/shop/') ||
                                normalizedLink.match(/\/c\/[\w-]+\/?$/);
              
              // Verificar si debemos visitar este enlace
              if (isCategoryPage || (options.includeProductPages && isProductPage)) {
                validLinks.push(link);
              }
            } catch (e) {
              console.error(`Enlace inválido: ${link}`);
            }
          }
          
          const uniqueLinks = [...new Set(validLinks)]; // Eliminar duplicados
          console.log(`Se encontraron ${uniqueLinks.length} subpáginas para rastrear desde ${pageUrl}`);
          
          // Rastrear subpáginas en paralelo con un límite
          const parallelLimit = 3; // Máximo de solicitudes paralelas
          for (let i = 0; i < uniqueLinks.length; i += parallelLimit) {
            const batch = uniqueLinks.slice(i, i + parallelLimit);
            await Promise.all(batch.map(async (link) => {
              if (!visitedUrls.has(link)) {
                try {
                  await crawlPage(link, depth + 1);
                } catch (error) {
                  console.error(`Error rastreando subpágina ${link}:`, error);
                }
              }
            }));
            
            // Breve retraso entre lotes para evitar sobrecargar el servidor
            if (i + parallelLimit < uniqueLinks.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
      } catch (error) {
        console.error(`Error procesando ${pageUrl}:`, error);
        // Continuar con otras páginas incluso si una falla
      }
    };
    
    // Intentar primero con la URL principal
    console.log("Iniciando rastreo desde URL principal:", baseUrl);
    await crawlPage(baseUrl);
    
    // Si encontramos pocos productos, intentar URLs de respaldo
    if (allProducts.length < 5) {
      console.log("Pocos productos encontrados. Intentando URLs de respaldo...");
      for (const backupUrl of BACKUP_URLS) {
        if (!visitedUrls.has(backupUrl) && allProducts.length < 10) {
          console.log(`Probando URL de respaldo: ${backupUrl}`);
          await crawlPage(backupUrl, 0);
        }
      }
    }
    
    // Si aún encontramos pocos productos, intentar obtener todas las páginas de categorías directamente
    if (allProducts.length < 10) {
      console.log("Aún pocos productos encontrados. Intentando todos los patrones comunes de páginas de categorías...");
      
      // Patrones comunes de URL de categoría
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
    
    // Eliminar productos duplicados basados en URL o ID
    const uniqueProducts = Array.from(
      new Map(allProducts.map(product => [product.url || product.id, product])).values()
    );
    
    // Filtrar productos con campos esenciales faltantes y agregar valores predeterminados
    const cleanedProducts = uniqueProducts.map(product => {
      // Asegurar que existan campos esenciales
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
    
    console.log(`Rastreo completado con ${visitedUrls.size} páginas visitadas. Se encontraron ${cleanedProducts.length} productos únicos.`);
    
    return {
      success: cleanedProducts.length > 0,
      products: cleanedProducts,
      storeInfo,
      contactInfo,
      lastUpdated: new Date().toISOString(),
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

/**
 * Extraer categorías de la lista de productos
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
