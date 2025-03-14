
interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  imageUrl: string;
  url: string;
  description?: string;
}

interface ScrapeResult {
  success: boolean;
  error?: string;
  products: Product[];
  lastUpdated: string;
}

/**
 * Fetches and parses product data from the target website
 */
export const scrapeProducts = async (): Promise<ScrapeResult> => {
  try {
    // In a real implementation, this would use a server-side function to fetch the website
    // For this demo, we're simulating the data
    console.log('Simulating web scraping from profesa.info');

    // This would normally come from an actual scraping operation
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Producto 1',
        price: '$19.99',
        category: 'Electrónicos',
        imageUrl: 'https://via.placeholder.com/150',
        url: 'https://profesa.info/producto1',
      },
      {
        id: '2',
        name: 'Producto 2',
        price: '$29.99',
        category: 'Ropa',
        imageUrl: 'https://via.placeholder.com/150',
        url: 'https://profesa.info/producto2',
      },
      {
        id: '3',
        name: 'Producto 3',
        price: '$9.99',
        category: 'Hogar',
        imageUrl: 'https://via.placeholder.com/150',
        url: 'https://profesa.info/producto3',
      },
      {
        id: '4',
        name: 'Producto 4',
        price: '$39.99',
        category: 'Electrónicos',
        imageUrl: 'https://via.placeholder.com/150',
        url: 'https://profesa.info/producto4',
      },
      {
        id: '5',
        name: 'Producto 5',
        price: '$49.99',
        category: 'Ropa',
        imageUrl: 'https://via.placeholder.com/150',
        url: 'https://profesa.info/producto5',
      },
      {
        id: '6',
        name: 'Producto 6',
        price: '$15.99',
        category: 'Hogar',
        imageUrl: 'https://via.placeholder.com/150',
        url: 'https://profesa.info/producto6',
      },
    ];

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      products: mockProducts,
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

export type { Product, ScrapeResult };
