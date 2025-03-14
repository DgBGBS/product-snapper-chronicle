
import { type Product } from './scraper';

interface StorageResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Saves product data to Google Sheets
 * In a real implementation, this would connect to Google Sheets API
 */
export const saveToGoogleSheets = async (products: Product[]): Promise<StorageResult> => {
  try {
    // This is a simulation since connecting to Google Sheets requires auth
    console.log('Simulating saving to Google Sheets:', products.length, 'products');
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      message: `Successfully saved ${products.length} products to Google Sheets`
    };
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save data to Google Sheets'
    };
  }
};

/**
 * Setup scheduled task for fetching and storing data
 * This is a frontend simulation - in production this would be a server-side task
 */
export const setupScheduledTask = (
  taskFn: () => Promise<void>,
  intervalMinutes: number,
  enableLogging = true
): (() => void) => {
  if (enableLogging) {
    console.log(`Setting up scheduled task to run every ${intervalMinutes} minutes`);
  }
  
  // Convert minutes to milliseconds
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Run immediately
  taskFn().catch(err => console.error('Error in scheduled task:', err));
  
  // Setup interval
  const intervalId = setInterval(() => {
    if (enableLogging) {
      console.log(`Running scheduled task (interval: ${intervalMinutes} minutes)`);
    }
    taskFn().catch(err => console.error('Error in scheduled task:', err));
  }, intervalMs);
  
  // Return cleanup function
  return () => {
    if (enableLogging) {
      console.log('Clearing scheduled task');
    }
    clearInterval(intervalId);
  };
};
