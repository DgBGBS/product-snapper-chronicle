
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
}

type CrawlResponse = CrawlStatusResponse | ErrorResponse;

export class FirecrawlService {
  private static API_KEY_STORAGE_KEY = 'firecrawl_api_key';
  
  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    console.log('API key saved successfully');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async crawlWebsite(url: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`Starting real web scraping for: ${url}`);
      
      // Use a CORS proxy to bypass CORS restrictions
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log(`Successfully fetched HTML content, length: ${html.length} characters`);
      
      // Parse the HTML to extract product information
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract product information using more robust selectors
      const productContainers = doc.querySelectorAll('.products .product, ul.products li.product, .product-grid .product, .woocommerce-loop-product, .product-item');
      console.log(`Found ${productContainers.length} product elements`);
      
      if (productContainers.length === 0) {
        // Try alternative selectors if the main one doesn't find anything
        const altProductContainers = doc.querySelectorAll('.product, .woocommerce-product, article, .item, [data-product-id]');
        if (altProductContainers.length > 0) {
          console.log(`Found ${altProductContainers.length} product elements with alternative selector`);
          return this.extractProductData(Array.from(altProductContainers), url, doc);
        }
        
        // Last resort: try to get all elements that might be products
        const possibleProductElements = Array.from(doc.querySelectorAll('*')).filter(el => {
          const classes = el.className?.toString() || '';
          const id = el.id?.toString() || '';
          return classes.includes('product') || id.includes('product') || 
                 el.querySelector('img') && el.querySelector('.price, [class*="price"]');
        });
        
        if (possibleProductElements.length > 0) {
          console.log(`Found ${possibleProductElements.length} possible product elements`);
          return this.extractProductData(possibleProductElements, url, doc);
        }
        
        throw new Error('No product elements found on the page');
      }
      
      return this.extractProductData(Array.from(productContainers), url, doc);
    } catch (error) {
      console.error('Error during web scraping:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape website'
      };
    }
  }
  
  private static extractProductData(productElements: Element[], baseUrl: string, fullDoc: Document): { success: boolean; data?: any; error?: string } {
    try {
      // Extract site-wide information
      const siteName = fullDoc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || 
                        fullDoc.querySelector('.site-title')?.textContent || 
                        new URL(baseUrl).hostname;
      
      // Get all available categories from the page
      const allCategories = new Set<string>();
      fullDoc.querySelectorAll('.product_cat, .product-category, .cat-item, [class*="category"]').forEach(el => {
        const catName = el.textContent?.trim();
        if (catName) allCategories.add(catName);
      });
      
      const products = productElements.map((el, index) => {
        // Extract product details with improved selectors
        const nameEl = el.querySelector('.woocommerce-loop-product__title, h2, .product-title, .name, [class*="title"], [class*="name"]');
        const priceEl = el.querySelector('.price, .product-price, .amount, [class*="price"]');
        const imgEl = el.querySelector('img');
        const linkEl = el.querySelector('a.woocommerce-LoopProduct-link, a.product-link, a, [href]');
        const categoryEl = el.closest('.product-category, [class*="category"]');
        const skuEl = el.querySelector('.sku, [class*="sku"]');
        const stockEl = el.querySelector('.stock, .in-stock, .out-of-stock, [class*="stock"]');
        const ratingEl = el.querySelector('.star-rating, .rating, [class*="rating"]');
        const brandEl = el.querySelector('.brand, .manufacturer, [class*="brand"], [class*="manufacturer"]');
        
        // Get detailed description
        const shortDescEl = el.querySelector('.short-description, .excerpt, [class*="excerpt"], [class*="description"]');
        
        // Get additional product details
        const metaEls = el.querySelectorAll('.product_meta, .meta, [class*="meta"]');
        const metaData: Record<string, string> = {};
        metaEls.forEach(meta => {
          const label = meta.querySelector('.label, dt')?.textContent?.trim();
          const value = meta.querySelector('.value, dd')?.textContent?.trim();
          if (label && value) {
            metaData[label] = value;
          }
        });
        
        // Get promotion/discount information
        const saleEl = el.querySelector('.onsale, .sale, [class*="sale"], [class*="discount"]');
        const originalPriceEl = el.querySelector('.regular-price, .original-price, del, [class*="regular-price"]');
        
        // Get category from various sources
        let category = 'Sin categoría';
        if (categoryEl) {
          category = categoryEl.textContent?.trim() || category;
        } else {
          // Try to extract category from product classes
          const classList = Array.from(el.classList);
          const categoryClass = classList.find(cls => cls.startsWith('product-cat-') || cls.includes('category'));
          if (categoryClass) {
            category = categoryClass.replace('product-cat-', '').replace(/-/g, ' ');
            // Capitalize first letter of each word
            category = category.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
          
          // If still no category, check for other indicators
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
        
        // Get image URL with improved handling
        let imageUrl = '';
        let additionalImages: string[] = [];
        
        if (imgEl) {
          // Try different attributes for image source
          imageUrl = imgEl.getAttribute('src') || 
                     imgEl.getAttribute('data-src') || 
                     imgEl.getAttribute('data-lazy-src') || 
                     imgEl.getAttribute('data-original') ||
                     imgEl.getAttribute('srcset')?.split(' ')[0] || '';
                     
          // Clean up the image URL
          imageUrl = imageUrl.replace(/-\d+x\d+(?=\.(jpg|jpeg|png|gif))/i, '');
        }
        
        // Look for additional product images
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
        
        // Ensure image URL is absolute
        if (imageUrl && !imageUrl.startsWith('http')) {
          const origin = new URL(baseUrl).origin;
          imageUrl = `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        
        // Fix additional image URLs
        additionalImages = additionalImages.map(imgUrl => {
          if (imgUrl && !imgUrl.startsWith('http')) {
            const origin = new URL(baseUrl).origin;
            return `${origin}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
          }
          return imgUrl;
        });
        
        // If still no image, use a better fallback
        if (!imageUrl) {
          imageUrl = 'https://via.placeholder.com/300x300?text=Producto';
        }
        
        // Get product URL with improved handling
        let productUrl = '';
        if (linkEl) {
          productUrl = linkEl.getAttribute('href') || '';
        }
        
        // Ensure product URL is absolute
        if (productUrl && !productUrl.startsWith('http')) {
          const origin = new URL(baseUrl).origin;
          productUrl = `${origin}${productUrl.startsWith('/') ? '' : '/'}${productUrl}`;
        }
        
        // Extract price with better handling
        let price = 'Precio no disponible';
        let originalPrice = '';
        let discount = '';
        
        if (priceEl) {
          price = priceEl.textContent?.trim() || price;
          // Clean up price format if needed
          price = price.replace(/\s+/g, ' ');
        }
        
        if (originalPriceEl) {
          originalPrice = originalPriceEl.textContent?.trim() || '';
        }
        
        if (saleEl) {
          discount = saleEl.textContent?.trim() || 'En oferta';
        }
        
        // Extract name with fallbacks
        let name = `Producto ${index + 1}`;
        if (nameEl && nameEl.textContent) {
          name = nameEl.textContent.trim();
        } else if (linkEl && linkEl.getAttribute('title')) {
          name = linkEl.getAttribute('title') || name;
        }
        
        // Extract SKU
        const sku = skuEl?.textContent?.trim() || '';
        
        // Extract stock status
        const stockStatus = stockEl?.textContent?.trim() || '';
        
        // Extract rating
        const rating = ratingEl?.textContent?.trim() || '';
        
        // Extract brand
        const brand = brandEl?.textContent?.trim() || '';
        
        // Create unique ID
        const id = `product-${index + 1}-${Date.now().toString().slice(-6)}`;
        
        // Extract description if available
        let description = `Producto de ${category} disponible en ${siteName}`;
        const descEl = el.querySelector('.product-excerpt, .description, .short-description, [class*="description"]');
        if (descEl) {
          description = descEl.textContent?.trim() || description;
        } else if (shortDescEl) {
          description = shortDescEl.textContent?.trim() || description;
        }
        
        // Extract specifications if available
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
      
      // Extract any global store information from the site
      const storeInfo = {
        name: siteName,
        url: baseUrl,
        categories: Array.from(allCategories),
        logo: fullDoc.querySelector('img.logo, .site-logo, header img')?.getAttribute('src') || '',
        description: fullDoc.querySelector('meta[name="description"]')?.getAttribute('content') || ''
      };
      
      // Get site contact info if available
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
      
      console.log(`Successfully extracted ${products.length} products with enhanced data fields`);
      
      return {
        success: true,
        data: {
          status: 'completed',
          completed: 1,
          total: 1,
          creditsUsed: 0,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          data: products,
          storeInfo: storeInfo,
          contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : undefined
        }
      };
    } catch (error) {
      console.error('Error extracting enhanced product data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract product data'
      };
    }
  }
}
