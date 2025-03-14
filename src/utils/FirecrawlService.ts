
interface ErrorResponse {
  success: false;
  error: string;
}

interface CrawlStatusResponse {
  success: true;
  status: string;
  completed: number;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  data: any[];
  links?: string[];
}

type CrawlResponse = CrawlStatusResponse | ErrorResponse;

export class FirecrawlService {
  private static API_KEY_STORAGE_KEY = 'firecrawl_api_key';
  
  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    console.log('Clave API guardada correctamente');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async crawlWebsite(url: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`Iniciando rastreo web para: ${url}`);
      
      // Usar proxies CORS alternativos para evitar problemas
      const corsProxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`
      ];
      
      let html = '';
      let proxySuccess = false;
      
      // Intentar cada proxy hasta que uno funcione
      for (const proxyUrl of corsProxies) {
        try {
          const response = await fetch(proxyUrl);
          
          if (response.ok) {
            html = await response.text();
            proxySuccess = true;
            console.log(`HTML obtenido correctamente usando proxy: ${proxyUrl}`);
            break;
          }
        } catch (proxyError) {
          console.log(`Proxy falló: ${proxyUrl}`, proxyError);
          // Continuar con el siguiente proxy
        }
      }
      
      // Si todos los proxies fallaron, intentar una solicitud directa como último recurso
      if (!proxySuccess) {
        try {
          console.log("Todos los proxies fallaron, intentando solicitud directa");
          const response = await fetch(url, {
            mode: 'no-cors',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          // El modo no-cors devuelve una respuesta opaca
          // No podemos verificar el estado ni leer el contenido normalmente
          // Pero podemos intentar procesarlo de todos modos
          const text = await response.text().catch(() => '');
          
          if (text) {
            html = text;
            console.log("La solicitud directa proporcionó algún contenido");
          } else {
            throw new Error("No se pudo recuperar contenido mediante solicitud directa");
          }
        } catch (directError) {
          console.error("La solicitud directa también falló:", directError);
          throw new Error("Todos los métodos de solicitud fallaron");
        }
      }
      
      // Verificar si tenemos contenido HTML para analizar
      if (!html || html.length < 100) {
        console.error("El HTML recuperado es demasiado corto o está vacío");
        return {
          success: false,
          error: "No se pudo obtener el contenido de la página"
        };
      }
      
      // Analizar el HTML para extraer información del producto
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extraer información del producto usando selectores más robustos
      const productContainers = doc.querySelectorAll('.products .product, ul.products li.product, .product-grid .product, .woocommerce-loop-product, .product-item');
      console.log(`Se encontraron ${productContainers.length} elementos de producto`);
      
      if (productContainers.length === 0) {
        // Probar selectores alternativos si el principal no encuentra nada
        const altProductContainers = doc.querySelectorAll('.product, .woocommerce-product, article, .item, [data-product-id]');
        if (altProductContainers.length > 0) {
          console.log(`Se encontraron ${altProductContainers.length} elementos de producto con selector alternativo`);
          return this.extractProductData(Array.from(altProductContainers), url, doc);
        }
        
        // Intentar extraer un solo producto si es una página de detalle de producto
        if (url.includes('/producto/') || url.includes('/product/')) {
          console.log('Parece ser una página de detalle de producto, intentando extraer producto individual');
          const productDetail = this.extractSingleProductDetail(doc, url);
          if (productDetail.success) {
            return productDetail;
          }
        }
        
        // Último recurso: intentar obtener todos los elementos que podrían ser productos
        const possibleProductElements = Array.from(doc.querySelectorAll('*')).filter(el => {
          const classes = el.className?.toString() || '';
          const id = el.id?.toString() || '';
          return classes.includes('product') || id.includes('product') || 
                 el.querySelector('img') && el.querySelector('.price, [class*="price"]');
        });
        
        if (possibleProductElements.length > 0) {
          console.log(`Se encontraron ${possibleProductElements.length} posibles elementos de producto`);
          return this.extractProductData(possibleProductElements, url, doc);
        }
        
        // Si no se encuentran productos, devolver error
        console.log("No se encontraron productos en la página");
        return {
          success: false,
          error: "No se encontraron productos en la página",
          data: {
            status: 'completed',
            data: [],
            links: this.extractAllLinks(doc, url)
          }
        };
      }
      
      return this.extractProductData(Array.from(productContainers), url, doc);
    } catch (error) {
      console.error('Error durante el rastreo web:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error durante el rastreo web",
        data: {
          status: 'error',
          data: [],
          links: []
        }
      };
    }
  }
  
  // Extraer todos los enlaces de la página para rastreo recursivo
  private static extractAllLinks(doc: Document, baseUrl: string): string[] {
    try {
      const links = Array.from(doc.querySelectorAll('a[href]'))
        .map(a => a.getAttribute('href'))
        .filter(href => href && !href.startsWith('#') && !href.startsWith('javascript:')) as string[];
      
      // Convertir URLs relativas a absolutas
      return links.map(href => {
        try {
          if (href.startsWith('http')) {
            return href;
          }
          
          // Manejar URLs relativas
          const base = new URL(baseUrl);
          if (href.startsWith('/')) {
            return `${base.origin}${href}`;
          } else {
            // Manejar URLs relativas a la ruta
            const path = base.pathname.split('/').slice(0, -1).join('/');
            return `${base.origin}${path}/${href}`;
          }
        } catch {
          return href; // Devolver tal cual si el análisis de URL falla
        }
      });
    } catch (error) {
      console.error('Error extrayendo enlaces:', error);
      return [];
    }
  }
  
  // Extraer un solo producto de una página de detalle de producto
  private static extractSingleProductDetail(doc: Document, url: string): { success: boolean; data?: any; error?: string } {
    try {
      const productTitle = doc.querySelector('h1.product_title, .product-title, .entry-title');
      const productPrice = doc.querySelector('.price, .product-price, [class*="price"]');
      const productImage = doc.querySelector('.product-image img, .woocommerce-product-gallery img, .product img');
      const productDesc = doc.querySelector('.description, .woocommerce-product-details__short-description, [class*="description"]');
      const productSku = doc.querySelector('.sku, [class*="sku"]');
      const productBrand = doc.querySelector('.brand, [class*="brand"], [class*="manufacturer"]');
      
      if (!productTitle) {
        return { 
          success: false, 
          error: "No se pudo extraer el título del producto",
          data: {
            status: 'completed',
            data: [],
            links: this.extractAllLinks(doc, url)
          }
        };
      }
      
      // Extraer imágenes adicionales
      const galleryImages = Array.from(doc.querySelectorAll('.product-gallery img, .woocommerce-product-gallery img, .thumbnails img'))
        .map(img => img.getAttribute('src') || img.getAttribute('data-src') || '')
        .filter(src => src && src.length > 0);
      
      // Extraer especificaciones/atributos
      const specsList: Record<string, string> = {};
      const specRows = doc.querySelectorAll('.product-attributes tr, .woocommerce-product-attributes tr, .specifications li');
      specRows.forEach(row => {
        const label = row.querySelector('th, .name, dt')?.textContent?.trim();
        const value = row.querySelector('td, .value, dd')?.textContent?.trim();
        if (label && value) {
          specsList[label] = value;
        }
      });
      
      const siteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || 
                        doc.querySelector('.site-title')?.textContent || 
                        new URL(url).hostname;
      
      // Crear un objeto de producto único
      const product = {
        id: `product-${Date.now()}`,
        name: productTitle?.textContent?.trim() || 'Producto Desconocido',
        price: productPrice?.textContent?.trim() || 'Precio no disponible',
        category: this.extractCategoryFromBreadcrumbs(doc) || 'Sin categoría',
        imageUrl: productImage?.getAttribute('src') || '',
        url: url,
        description: productDesc?.textContent?.trim(),
        additionalImages: galleryImages.length > 0 ? galleryImages : undefined,
        sku: productSku?.textContent?.trim(),
        brand: productBrand?.textContent?.trim(),
        specifications: Object.keys(specsList).length > 0 ? specsList : undefined,
        siteSource: siteName
      };
      
      return {
        success: true,
        data: {
          status: 'completed',
          completed: 1,
          total: 1,
          creditsUsed: 0,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          data: [product],
          links: this.extractAllLinks(doc, url)
        }
      };
    } catch (error) {
      console.error('Error extrayendo producto individual:', error);
      return {
        success: false,
        error: "Error al extraer producto individual",
        data: {
          status: 'error',
          data: [],
          links: []
        }
      };
    }
  }
  
  // Extraer categoría de las migas de pan
  private static extractCategoryFromBreadcrumbs(doc: Document): string | undefined {
    const breadcrumbs = doc.querySelector('.woocommerce-breadcrumb, .breadcrumb, [class*="breadcrumb"]');
    if (breadcrumbs) {
      const breadcrumbText = breadcrumbs.textContent || '';
      const breadcrumbParts = breadcrumbText.split(/[\/\>\|]/);
      if (breadcrumbParts.length > 1) {
        return breadcrumbParts[1].trim();
      }
    }
    return undefined;
  }
  
  private static extractProductData(productElements: Element[], baseUrl: string, fullDoc: Document): { success: boolean; data?: any; error?: string } {
    try {
      // Extraer información de todo el sitio
      const siteName = fullDoc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || 
                        fullDoc.querySelector('.site-title')?.textContent || 
                        new URL(baseUrl).hostname;
      
      // Obtener todas las categorías disponibles de la página
      const allCategories = new Set<string>();
      fullDoc.querySelectorAll('.product_cat, .product-category, .cat-item, [class*="category"]').forEach(el => {
        const catName = el.textContent?.trim();
        if (catName) allCategories.add(catName);
      });
      
      const products = productElements.map((el, index) => {
        // Extraer detalles del producto con selectores mejorados
        const nameEl = el.querySelector('.woocommerce-loop-product__title, h2, .product-title, .name, [class*="title"], [class*="name"]');
        const priceEl = el.querySelector('.price, .product-price, .amount, [class*="price"]');
        const imgEl = el.querySelector('img');
        const linkEl = el.querySelector('a.woocommerce-LoopProduct-link, a.product-link, a, [href]');
        const categoryEl = el.closest('.product-category, [class*="category"]');
        const skuEl = el.querySelector('.sku, [class*="sku"]');
        const stockEl = el.querySelector('.stock, .in-stock, .out-of-stock, [class*="stock"]');
        const ratingEl = el.querySelector('.star-rating, .rating, [class*="rating"]');
        const brandEl = el.querySelector('.brand, .manufacturer, [class*="brand"], [class*="manufacturer"]');
        
        // Obtener descripción detallada
        const shortDescEl = el.querySelector('.short-description, .excerpt, [class*="excerpt"], [class*="description"]');
        
        // Obtener detalles adicionales del producto
        const metaEls = el.querySelectorAll('.product_meta, .meta, [class*="meta"]');
        const metaData: Record<string, string> = {};
        metaEls.forEach(meta => {
          const label = meta.querySelector('.label, dt')?.textContent?.trim();
          const value = meta.querySelector('.value, dd')?.textContent?.trim();
          if (label && value) {
            metaData[label] = value;
          }
        });
        
        // Obtener información de promoción/descuento
        const saleEl = el.querySelector('.onsale, .sale, [class*="sale"], [class*="discount"]');
        const originalPriceEl = el.querySelector('.regular-price, .original-price, del, [class*="regular-price"]');
        
        // Obtener categoría de varias fuentes
        let category = 'Sin categoría';
        if (categoryEl) {
          category = categoryEl.textContent?.trim() || category;
        } else {
          // Intentar extraer categoría de las clases del producto
          const classList = Array.from(el.classList);
          const categoryClass = classList.find(cls => cls.startsWith('product-cat-') || cls.includes('category'));
          if (categoryClass) {
            category = categoryClass.replace('product-cat-', '').replace(/-/g, ' ');
            // Capitalizar primera letra de cada palabra
            category = category.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
          
          // Si aún no hay categoría, buscar otros indicadores
          if (category === 'Sin categoría') {
            const breadcrumbs = fullDoc.querySelector('.woocommerce-breadcrumb, .breadcrumb, [class*="breadcrumb"]');
            if (breadcrumbs) {
              const breadcrumbText = breadcrumbs.textContent || '';
              const breadcrumbParts = breadcrumbText.split(/[\/\>\|]/);
              if (breadcrumbParts.length > 1) {
                category = breadcrumbParts[1].trim();
              }
            }
          }
        }
        
        // Obtener URL de imagen con manejo mejorado
        let imageUrl = '';
        let additionalImages: string[] = [];
        
        if (imgEl) {
          // Probar diferentes atributos para la fuente de la imagen
          imageUrl = imgEl.getAttribute('src') || 
                     imgEl.getAttribute('data-src') || 
                     imgEl.getAttribute('data-lazy-src') || 
                     imgEl.getAttribute('data-original') ||
                     imgEl.getAttribute('srcset')?.split(' ')[0] || '';
                     
          // Limpiar la URL de la imagen
          imageUrl = imageUrl.replace(/-\d+x\d+(?=\.(jpg|jpeg|png|gif))/i, '');
        }
        
        // Buscar imágenes adicionales del producto
        const galleryItems = el.querySelectorAll('.gallery-image, [class*="gallery"], [data-thumb]');
        galleryItems.forEach(img => {
          const imgSrc = img.getAttribute('src') || 
                        img.getAttribute('data-src') || 
                        img.getAttribute('data-large_image') ||
                        img.getAttribute('data-thumb');
          if (imgSrc && !additionalImages.includes(imgSrc)) {
            additionalImages.push(imgSrc);
          }
        });
        
        // Asegurar que la URL de la imagen sea absoluta
        if (imageUrl && !imageUrl.startsWith('http')) {
          const origin = new URL(baseUrl).origin;
          imageUrl = `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        
        // Corregir URLs de imágenes adicionales
        additionalImages = additionalImages.map(imgUrl => {
          if (imgUrl && !imgUrl.startsWith('http')) {
            const origin = new URL(baseUrl).origin;
            return `${origin}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
          }
          return imgUrl;
        });
        
        // Si aún no hay imagen, usar un valor por defecto
        if (!imageUrl) {
          imageUrl = '';
        }
        
        // Obtener URL del producto con manejo mejorado
        let productUrl = '';
        if (linkEl) {
          productUrl = linkEl.getAttribute('href') || '';
        }
        
        // Asegurar que la URL del producto sea absoluta
        if (productUrl && !productUrl.startsWith('http')) {
          const origin = new URL(baseUrl).origin;
          productUrl = `${origin}${productUrl.startsWith('/') ? '' : '/'}${productUrl}`;
        }
        
        // Extraer precio con mejor manejo
        let price = 'Precio no disponible';
        let originalPrice = '';
        let discount = '';
        
        if (priceEl) {
          price = priceEl.textContent?.trim() || price;
          // Limpiar formato del precio si es necesario
          price = price.replace(/\s+/g, ' ');
        }
        
        if (originalPriceEl) {
          originalPrice = originalPriceEl.textContent?.trim() || '';
        }
        
        if (saleEl) {
          discount = saleEl.textContent?.trim() || 'En oferta';
        }
        
        // Extraer nombre con alternativas
        let name = `Producto ${index + 1}`;
        if (nameEl && nameEl.textContent) {
          name = nameEl.textContent.trim();
        } else if (linkEl && linkEl.getAttribute('title')) {
          name = linkEl.getAttribute('title') || name;
        }
        
        // Extraer SKU
        const sku = skuEl?.textContent?.trim() || '';
        
        // Extraer estado de stock
        const stockStatus = stockEl?.textContent?.trim() || '';
        
        // Extraer valoración
        const rating = ratingEl?.textContent?.trim() || '';
        
        // Extraer marca
        const brand = brandEl?.textContent?.trim() || '';
        
        // Crear ID único
        const id = `product-${index + 1}-${Date.now().toString().slice(-6)}`;
        
        // Extraer descripción si está disponible
        let description = `Producto de ${category} disponible en ${siteName}`;
        const descEl = el.querySelector('.product-excerpt, .description, .short-description, [class*="description"]');
        if (descEl) {
          description = descEl.textContent?.trim() || description;
        } else if (shortDescEl) {
          description = shortDescEl.textContent?.trim() || description;
        }
        
        // Extraer especificaciones si están disponibles
        const specsList: Record<string, string> = {};
        const specsEl = el.querySelector('.specifications, .specs, .product-specs, [class*="specs"]');
        if (specsEl) {
          const specItems = specsEl.querySelectorAll('li, tr, [class*="spec-item"]');
          specItems.forEach(item => {
            const specLabel = item.querySelector('.label, th, dt')?.textContent?.trim();
            const specValue = item.querySelector('.value, td, dd')?.textContent?.trim();
            if (specLabel && specValue) {
              specsList[specLabel] = specValue;
            } else {
              const content = item.textContent?.trim();
              if (content) {
                const parts = content.split(':');
                if (parts.length === 2) {
                  specsList[parts[0].trim()] = parts[1].trim();
                }
              }
            }
          });
        }
        
        return {
          id,
          name,
          price,
          originalPrice: originalPrice || undefined,
          discount: discount || undefined,
          category,
          imageUrl,
          additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
          url: productUrl || baseUrl,
          description,
          sku: sku || undefined,
          stockStatus: stockStatus || undefined,
          rating: rating || undefined,
          brand: brand || undefined,
          specifications: Object.keys(specsList).length > 0 ? specsList : undefined,
          metadata: Object.keys(metaData).length > 0 ? metaData : undefined,
          siteSource: siteName
        };
      });
      
      // Extraer cualquier información global de la tienda del sitio
      const storeInfo = {
        name: siteName,
        url: baseUrl,
        categories: Array.from(allCategories),
        logo: fullDoc.querySelector('img.logo, .site-logo, header img')?.getAttribute('src') || '',
        description: fullDoc.querySelector('meta[name="description"]')?.getAttribute('content') || ''
      };
      
      // Obtener información de contacto del sitio si está disponible
      const contactInfo: Record<string, string> = {};
      const contactElements = fullDoc.querySelectorAll('.contact-info, .contact, footer, [class*="contact"]');
      contactElements.forEach(el => {
        const phoneMatch = el.textContent?.match(/(?:Tel|Phone|Teléfono|Telefono)[^\d]*([\d\s\+\-\(\)\.]{7,})/i);
        const emailMatch = el.textContent?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
        const addressMatch = el.textContent?.match(/(?:Dirección|Direccion|Address)[^\w]*([\w\s,\.]+)/i);
        
        if (phoneMatch && phoneMatch[1]) contactInfo.phone = phoneMatch[1].trim();
        if (emailMatch) contactInfo.email = emailMatch[0].trim();
        if (addressMatch && addressMatch[1]) contactInfo.address = addressMatch[1].trim();
      });
      
      // Extraer todos los enlaces para rastreo recursivo
      const links = this.extractAllLinks(fullDoc, baseUrl);
      console.log(`Se extrajeron ${links.length} enlaces de ${baseUrl}`);
      
      console.log(`Se extrajeron con éxito ${products.length} productos con campos de datos mejorados`);
      
      return {
        success: products.length > 0,
        data: {
          status: 'completed',
          completed: 1,
          total: 1,
          creditsUsed: 0,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          data: products,
          storeInfo: storeInfo,
          contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
          links: links
        }
      };
    } catch (error) {
      console.error('Error extrayendo datos de producto mejorados:', error);
      return {
        success: false,
        error: "Error al extraer datos de productos",
        data: {
          status: 'error',
          data: [],
          links: []
        }
      };
    }
  }
}
