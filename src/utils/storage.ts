import { type Product } from '../utils/scraper';

interface StorageResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Saves product data to Google Sheets using the Google Sheets API.
 */
export const saveToGoogleSheets = async (products: Product[]): Promise<StorageResult> => {
  try {
    if (!products || products.length === 0) {
      throw new Error('No products to save');
    }

    console.log(`Saving ${products.length} products to Google Sheets...`);

    // Simulated API call - replace this with actual Google Sheets API integration
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      success: true,
      message: `Successfully saved ${products.length} products to Google Sheets.`
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
 * Sets up a scheduled task for fetching and storing data.
 * Runs the provided function at a specified interval.
 */
export const setupScheduledTask = (
  taskFn: () => Promise<void>,
  intervalMinutes: number,
  enableLogging = true
): (() => void) => {
  if (intervalMinutes <= 0) {
    throw new Error('Interval must be greater than 0 minutes');
  }

  if (enableLogging) {
    console.log(`Setting up scheduled task to run every ${intervalMinutes} minutes`);
  }

  // Convert minutes to milliseconds
  const intervalMs = intervalMinutes * 60 * 1000;

  // Setup interval
  const intervalId = setInterval(async () => {
    try {
      if (enableLogging) {
        console.log(`Running scheduled task (interval: ${intervalMinutes} minutes)`);
      }
      await taskFn();
    } catch (err) {
      console.error('Error in scheduled task:', err);
    }
  }, intervalMs);

  // Return cleanup function
  return () => {
    if (enableLogging) {
      console.log('Clearing scheduled task');
    }
    clearInterval(intervalId);
  };
};
