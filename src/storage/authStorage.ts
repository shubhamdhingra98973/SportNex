import AsyncStorage from '@react-native-async-storage/async-storage';
import { IUserState } from '@global/types';

const AUTH_STORAGE_KEY = '@SportNex:auth';

/**
 * Save authentication state to AsyncStorage
 */
export const saveAuthState = async (authState: IUserState): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  } catch (error) {
    console.error('Error saving auth state:', error);
    throw error;
  }
};

/**
 * Load authentication state from AsyncStorage
 */
export const loadAuthState = async (): Promise<IUserState | null> => {
  try {
    const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (authData) {
      return JSON.parse(authData) as IUserState;
    }
    return null;
  } catch (error) {
    console.error('Error loading auth state:', error);
    return null;
  }
};

/**
 * Clear authentication state from AsyncStorage
 */
export const clearAuthState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing auth state:', error);
    throw error;
  }
};

/**
 * Check if user is authenticated (has valid token)
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const authState = await loadAuthState();
  return authState !== null && authState.loggedInToken !== '';
};

