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
  "/tienda/",
  "/shop/",
  "/productos/",
  "/todos-los-productos/",
  "/catalogo/",
  "/categoria-producto/"
];

/**
 * Proxies CORS para intentar obtener el contenido
 */
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`
];

/**
 * Extrae y analiza datos de productos del sitio web objetivo
 * con soporte para rastreo recursivo de subpáginas
 */
export const scrapeProducts = async (url: string, options = { 
  recursive: true,
  maxDepth: 2,
  includeProductPages: true
}): Promise<ScrapeResult> => {
  try {
    console.log(`Iniciando rastreo web desde ${url} con opciones:`, options);
    
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
      console.error(`URL inválida: ${baseUrl}, intentando corregir`);
      // Intentar agregar protocolo si falta
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
    
    // Función para verificar si una URL es del mismo dominio
    const isSameDomain = (urlToCheck: string): boolean => {
      try {
        const checkUrl = new URL(urlToCheck);
        return checkUrl.hostname === baseUrlObj.hostname;
      } catch (e) {
        return false;
      }
    };
    
    // Normaliza una URL relativa a absoluta
    const normalizeUrl = (relativeUrl: string): string => {
      try {
        // Si ya es una URL absoluta
        if (relativeUrl.startsWith('http')) {
          return relativeUrl;
        }
        
        // Manejar URLs relativas
        if (relativeUrl.startsWith('/')) {
          return `${baseUrlObj.origin}${relativeUrl}`;
        } else {
          // URLs relativas a la ruta actual
          const path = baseUrlObj.pathname.split('/').slice(0, -1).join('/');
          return `${baseUrlObj.origin}${path}/${relativeUrl}`;
        }
      } catch (e) {
        console.error(`Error normalizando URL: ${relativeUrl}`, e);
        return relativeUrl;
      }
    };
    
    // Función para intentar acceder a una URL usando diferentes proxies CORS
    const fetchWithCorsProxy = async (urlToFetch: string): Promise<string> => {
      let html = '';
      let fetchError = null;
      
      // Primero intenta una solicitud directa (puede funcionar en algunos casos)
      try {
        console.log(`Intentando solicitud directa a: ${urlToFetch}`);
        const response = await fetch(urlToFetch);
        if (response.ok) {
          html = await response.text();
          console.log(`Solicitud directa exitosa para: ${urlToFetch}`);
          return html;
        }
      } catch (error) {
        console.log(`Solicitud directa falló, probando proxies CORS...`);
        fetchError = error;
      }
      
      // Si falla la solicitud directa, intenta con los proxies CORS
      for (const proxyGenerator of CORS_PROXIES) {
        try {
          const proxyUrl = proxyGenerator(urlToFetch);
          console.log(`Intentando con proxy CORS: ${proxyUrl}`);
          
          const response = await fetch(proxyUrl);
          if (response.ok) {
            html = await response.text();
            console.log(`Proxy CORS exitoso para: ${urlToFetch}`);
            return html;
          }
        } catch (error) {
          console.log(`Proxy CORS falló: ${proxyGenerator(urlToFetch)}`);
          fetchError = error;
        }
      }
      
      // Si todas las opciones fallan, intenta una solicitud sin-cors como último recurso
      try {
        console.log(`Intentando solicitud no-cors a: ${urlToFetch}`);
        const response = await fetch(urlToFetch, {
          mode: 'no-cors',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        // El modo no-cors no permite leer el contenido, pero intentamos de todos modos
        try {
          html = await response.text();
          if (html) {
            console.log(`Solicitud no-cors produjo algún contenido para: ${urlToFetch}`);
            return html;
          }
        } catch (e) {
          console.error(`No se pudo leer la respuesta no-cors: ${urlToFetch}`);
        }
      } catch (error) {
        console.error(`Solicitud no-cors también falló: ${urlToFetch}`);
      }
      
      // Si llegamos aquí, todas las opciones fallaron
      throw fetchError || new Error(`No se pudo acceder a: ${urlToFetch}`);
    };
    
    // Función de rastreo recursiva
    const crawlPage = async (pageUrl: string, depth: number = 0): Promise<void> => {
      // Saltar si ya visitada o máxima profundidad alcanzada
      if (visitedUrls.has(pageUrl) || depth > options.maxDepth) {
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
          url: product.url || pageUrl,
          siteSource: product.siteSource || baseUrlObj.hostname
        }));
        
        // Guardar productos
        if (processedProducts.length > 0) {
          console.log(`Se encontraron ${processedProducts.length} productos en ${pageUrl}`);
          
          // Filtrar productos duplicados antes de añadirlos
          const existingIds = new Set(allProducts.map(p => p.id));
          const newProducts = processedProducts.filter(p => !existingIds.has(p.id));
          
          allProducts.push(...newProducts);
          console.log(`Añadidos ${newProducts.length} productos nuevos. Total actual: ${allProducts.length}`);
        }
        
        // Almacenar información de la tienda solo desde la primera página
        if (depth === 0 && result.data?.storeInfo) {
          storeInfo = result.data.storeInfo;
          console.log(`Información de la tienda guardada: ${storeInfo.name}`);
        }
        
        // Almacenar información de contacto solo desde la primera página
        if (depth === 0 && result.data?.contactInfo) {
          contactInfo = result.data.contactInfo;
          console.log(`Información de contacto guardada`);
        }
        
        // Si la opción recursiva está habilitada, extraer y seguir enlaces
        if (options.recursive && depth < options.maxDepth) {
          const linksData = result.data?.links || [];
          console.log(`Se encontraron ${linksData.length} enlaces potenciales en ${pageUrl}`);
          
          // Filtrar enlaces a seguir - asegurar que todos sean strings
          const validLinks: string[] = [];
          
          for (const link of linksData) {
            // Saltar si el enlace no es un string
            if (typeof link !== 'string') {
              continue;
            }
            
            try {
              // Asegurar que el enlace sea válido
              const normalizedLink = normalizeUrl(link);
              
              // Solo seguir enlaces del mismo dominio
              if (!isSameDomain(normalizedLink)) {
                continue;
              }
              
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
                validLinks.push(normalizedLink);
              }
            } catch (e) {
              console.error(`Enlace inválido: ${link}`, e);
            }
          }
          
          const uniqueLinks = [...new Set(validLinks)]; // Eliminar duplicados
          console.log(`Se encontraron ${uniqueLinks.length} subpáginas válidas para rastrear desde ${pageUrl}`);
          
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
      
      for (const backupPath of BACKUP_URLS) {
        const backupUrl = `${baseUrlObj.origin}${backupPath}`;
        if (!visitedUrls.has(backupUrl)) {
          console.log(`Probando URL de respaldo: ${backupUrl}`);
          await crawlPage(backupUrl, 0);
          
          // Si ya encontramos suficientes productos, detenerse
          if (allProducts.length >= 10) {
            break;
          }
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
    
    // Si no encontramos ningún producto, enviar mensaje de error pero sin fallar la operación
    if (cleanedProducts.length === 0) {
      return {
        success: true,
        products: [],
        error: "No se encontraron productos en el sitio web. Puede que el sitio esté protegido contra rastreo o utilice tecnologías que no podemos procesar.",
        lastUpdated: new Date().toISOString(),
      };
    }
    
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
