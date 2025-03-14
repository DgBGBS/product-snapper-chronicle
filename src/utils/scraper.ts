
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
    // En una implementación real, esto usaría una función del lado del servidor para obtener el sitio web
    // Para esta demostración, estamos simulando los datos pero con la URL correcta
    console.log('Simulando web scraping desde https://profesa.info/tienda');

    // Generar datos de muestra más realistas con mejores imágenes
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Laptop HP Pavilion',
        price: '$19,999',
        category: 'Electrónicos',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        url: 'https://profesa.info/tienda/producto1',
        description: 'Laptop con procesador Core i5, 8GB RAM, 512GB SSD'
      },
      {
        id: '2',
        name: 'Zapatillas Nike Air',
        price: '$2,999',
        category: 'Ropa',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        url: 'https://profesa.info/tienda/producto2',
        description: 'Zapatillas deportivas con tecnología de amortiguación'
      },
      {
        id: '3',
        name: 'Sartén Antiadherente',
        price: '$999',
        category: 'Hogar',
        imageUrl: 'https://images.unsplash.com/photo-1622428856523-83cd2cb033df?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        url: 'https://profesa.info/tienda/producto3',
        description: 'Sartén de 28cm con recubrimiento antiadherente de calidad'
      },
      {
        id: '4',
        name: 'Auriculares Bluetooth',
        price: '$3,999',
        category: 'Electrónicos',
        imageUrl: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        url: 'https://profesa.info/tienda/producto4',
        description: 'Auriculares inalámbricos con cancelación de ruido'
      },
      {
        id: '5',
        name: 'Chaqueta de Cuero',
        price: '$4,999',
        category: 'Ropa',
        imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        url: 'https://profesa.info/tienda/producto5',
        description: 'Chaqueta de cuero genuino con forro interior'
      },
      {
        id: '6',
        name: 'Juego de Ollas',
        price: '$1,599',
        category: 'Hogar',
        imageUrl: 'https://images.unsplash.com/photo-1584990347449-a5f503f30c6f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        url: 'https://profesa.info/tienda/producto6',
        description: 'Juego de 5 ollas de acero inoxidable con tapas de vidrio'
      },
      {
        id: '7',
        name: 'Smartphone Samsung',
        price: '$12,999',
        category: 'Electrónicos',
        imageUrl: 'https://images.unsplash.com/photo-1578598336057-fa3c1e4403f9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        url: 'https://profesa.info/tienda/producto7',
        description: 'Smartphone con pantalla AMOLED, 128GB de almacenamiento'
      },
      {
        id: '8',
        name: 'Reloj Deportivo',
        price: '$1,899',
        category: 'Accesorios',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        url: 'https://profesa.info/tienda/producto8',
        description: 'Reloj resistente al agua con monitor de ritmo cardíaco'
      },
    ];

    // Simular algún tiempo de procesamiento
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
