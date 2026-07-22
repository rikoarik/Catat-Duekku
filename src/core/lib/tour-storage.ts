import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_TOUR_COMPLETED_KEY = '@catat_duekku_app_tour_completed';

/**
 * Checks if the user has already completed or skipped the interactive app feature tour.
 */
export async function isAppTourCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(APP_TOUR_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('Error reading app tour completion state:', error);
    return false;
  }
}

/**
 * Sets the app feature tour completed state in AsyncStorage.
 */
export async function setAppTourCompleted(completed: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_TOUR_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch (error) {
    console.warn('Error saving app tour completion state:', error);
  }
}

/**
 * Resets the app feature tour completion state so the tour can be replayed.
 */
export async function resetAppTour(): Promise<void> {
  try {
    await AsyncStorage.removeItem(APP_TOUR_COMPLETED_KEY);
  } catch (error) {
    console.warn('Error resetting app tour state:', error);
  }
}
