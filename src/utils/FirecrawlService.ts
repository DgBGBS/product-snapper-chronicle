
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

  static async crawlWebsite(url: string): Promise<{ success: boolean; error?: string; data?: any }> {
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
      const productContainers = doc.querySelectorAll('.products .product, ul.products li.product');
      console.log(`Found ${productContainers.length} product elements`);
      
      if (productContainers.length === 0) {
        // Try alternative selectors if the main one doesn't find anything
        const altProductContainers = doc.querySelectorAll('.product, .woocommerce-product');
        if (altProductContainers.length > 0) {
          console.log(`Found ${altProductContainers.length} product elements with alternative selector`);
          return this.extractProductData(Array.from(altProductContainers), url);
        }
        throw new Error('No product elements found on the page');
      }
      
      return this.extractProductData(Array.from(productContainers), url);
    } catch (error) {
      console.error('Error during web scraping:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape website'
      };
    }
  }
  
  private static extractProductData(productElements: Element[], baseUrl: string): { success: boolean; data?: any } {
    try {
      const products = productElements.map((el, index) => {
        // Extract product details with improved selectors
        const nameEl = el.querySelector('.woocommerce-loop-product__title, h2, .product-title, .name');
        const priceEl = el.querySelector('.price, .product-price, .amount');
        const imgEl = el.querySelector('img');
        const linkEl = el.querySelector('a.woocommerce-LoopProduct-link, a.product-link, a');
        const categoryEl = el.closest('.product-category-name, .product-category');
        
        // Get category from various sources
        let category = 'Sin categoría';
        if (categoryEl) {
          category = categoryEl.textContent?.trim() || category;
        } else {
          // Try to extract category from product classes
          const classList = Array.from(el.classList);
          const categoryClass = classList.find(cls => cls.startsWith('product-cat-'));
          if (categoryClass) {
            category = categoryClass.replace('product-cat-', '').replace(/-/g, ' ');
            // Capitalize first letter of each word
            category = category.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
          
          // If still no category, check for other indicators
          if (category === 'Sin categoría') {
            const breadcrumbs = document.querySelector('.woocommerce-breadcrumb, .breadcrumb');
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
        if (imgEl) {
          // Try different attributes for image source
          imageUrl = imgEl.getAttribute('src') || 
                     imgEl.getAttribute('data-src') || 
                     imgEl.getAttribute('data-lazy-src') || 
                     imgEl.getAttribute('srcset')?.split(' ')[0] || '';
                     
          // Clean up the image URL
          imageUrl = imageUrl.replace(/-\d+x\d+(?=\.(jpg|jpeg|png|gif))/i, '');
        }
        
        // Ensure image URL is absolute
        if (imageUrl && !imageUrl.startsWith('http')) {
          const origin = new URL(baseUrl).origin;
          imageUrl = `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        
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
        if (priceEl) {
          price = priceEl.textContent?.trim() || price;
          // Clean up price format if needed
          price = price.replace(/\s+/g, ' ');
        }
        
        // Extract name with fallbacks
        let name = `Producto ${index + 1}`;
        if (nameEl && nameEl.textContent) {
          name = nameEl.textContent.trim();
        } else if (linkEl && linkEl.getAttribute('title')) {
          name = linkEl.getAttribute('title') || name;
        }
        
        // Create unique ID
        const id = `product-${index + 1}-${Date.now().toString().slice(-6)}`;
        
        // Extract description if available
        let description = `Producto de ${category} disponible en Profesa`;
        const descEl = el.querySelector('.product-excerpt, .description, .short-description');
        if (descEl) {
          description = descEl.textContent?.trim() || description;
        }
        
        return {
          id,
          name,
          price,
          category,
          imageUrl,
          url: productUrl || baseUrl,
          description
        };
      });
      
      console.log(`Successfully extracted ${products.length} products with improved extraction`);
      
      return {
        success: true,
        data: {
          status: 'completed',
          completed: 1,
          total: 1,
          creditsUsed: 0,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          data: products
        }
      };
    } catch (error) {
      console.error('Error extracting product data:', error);
      return {
        success: false,
        error: 'Failed to extract product data'
      };
    }
  }
}
