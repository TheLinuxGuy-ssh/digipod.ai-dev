// src/lib/hustleMeter.ts

/**
 * Increments the "minutes saved" in localStorage for the Anti-Hustle Meter.
 * This should be called after any AI action is successfully completed.
 * @param {number} minutes - The number of minutes to add. Defaults to 1.
 */
export function incrementMinutesSaved(minutes: number = 1) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const saved = parseInt(localStorage.getItem('digipod-minutes-saved') || '0', 10);
    const newTotal = saved + minutes;
    localStorage.setItem('digipod-minutes-saved', String(newTotal));
    // Dispatch a storage event to notify other tabs/components
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('Failed to update hustle meter:', error);
  }
} 