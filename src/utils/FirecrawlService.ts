
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
      
      // Extract product information using selectors specific to profesa.info/tienda
      const productContainers = doc.querySelectorAll('.products .product');
      console.log(`Found ${productContainers.length} product elements`);
      
      if (productContainers.length === 0) {
        throw new Error('No product elements found on the page');
      }
      
      const products = Array.from(productContainers).map((el, index) => {
        // Extract product details using selectors specific to profesa.info
        const nameEl = el.querySelector('.woocommerce-loop-product__title');
        const priceEl = el.querySelector('.price');
        const imgEl = el.querySelector('img');
        const linkEl = el.querySelector('a.woocommerce-LoopProduct-link');
        const categoryEl = el.closest('.product-category-name');
        
        // Get category from class name if not found in DOM
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
        }
        
        // Get product URL
        const productUrl = linkEl?.getAttribute('href') || url;
        
        // Create unique ID
        const id = `product-${index + 1}-${Date.now().toString().slice(-6)}`;
        
        return {
          id,
          name: nameEl?.textContent?.trim() || `Producto ${index + 1}`,
          price: priceEl?.textContent?.trim() || 'Precio no disponible',
          category,
          imageUrl: imgEl?.getAttribute('src') || 'https://via.placeholder.com/300x300?text=Producto',
          url: productUrl,
          description: `Producto de ${category} disponible en Profesa`
        };
      });
      
      console.log(`Successfully extracted ${products.length} products`);
      
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
      console.error('Error during web scraping:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape website'
      };
    }
  }
}
