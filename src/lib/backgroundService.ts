import { emailMonitor } from './emailMonitor';

// Initialize background services
export async function initializeBackgroundServices() {
  try {
    console.log('Initializing background services...');
    
    // Start email monitoring service
    await emailMonitor.startMonitoring();
    
    console.log('Background services initialized successfully');
  } catch (error) {
    console.error('Error initializing background services:', error);
  }
}

// Cleanup function for graceful shutdown
export async function cleanupBackgroundServices() {
  try {
    console.log('Cleaning up background services...');
    
    // Stop email monitoring service
    await emailMonitor.stopMonitoring();
    
    console.log('Background services cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up background services:', error);
  }
}

// Export for use in server startup
export { emailMonitor }; 