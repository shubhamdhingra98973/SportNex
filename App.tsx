/**
 *
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  StatusBar,
  useColorScheme,
  View,
  ActivityIndicator,
  Text,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaProvider,

} from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { ScaledSheet } from 'react-native-size-matters';
import StackNavigator from './src/navigation/StackNavigator';
import configureStore from '@storage/redux/configureStore';
import SqliteManager from '@storage/sqlite/SqliteManager';
import { loadAuthState } from '@storage/authStorage';
import { login } from '@storage/redux/actions/userActions';

const store = configureStore();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}

function AppContent() {
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialRoute, setInitialRoute] = useState<'LoginRegisterScreen' | 'DashboardScreen'>('LoginRegisterScreen');
  const dispatch = useDispatch();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      // Check if database is initialized
      const initialized = await SqliteManager.isDatabaseInitialized();
      
      if (!initialized) {
        console.log('📦 Database not initialized. Setting up...');
        // Initialize the database and create tables
        await SqliteManager.initializeDatabase();
        console.log('✅ Database setup completed');
      } else {
        console.log('✅ Database already initialized');
      }
      await SqliteManager.getDBPath();
      setIsDbInitialized(true);

      // Check for saved auth state
      const savedAuthState = await loadAuthState();
      if (savedAuthState && savedAuthState.loggedInToken) {
        console.log('✅ Found saved auth state, restoring session...');
        // Restore auth state to Redux
        dispatch(login(
          savedAuthState.loggedInToken,
          savedAuthState.loggedInUser_ID?.toString() ?? '',
          savedAuthState.loggedInRole,
          savedAuthState.loggedInName || ''
        ));
        // Set initial route to DashboardScreen
        setInitialRoute('DashboardScreen');
      } else {
        console.log('ℹ️ No saved auth state found');
        setInitialRoute('LoginRegisterScreen');
      }
    } catch (err: any) {
      console.error('❌ Failed to initialize app:', err);
      setError(err.message || 'Failed to initialize app');
    } finally {
      setIsInitializing(false);
    }
  };


  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3377FF" />
        <Text style={styles.loadingText}>Initializing database...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={initializeApp}>
          Tap to retry
        </Text>
      </View>
    );
  }

  if (!isDbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3377FF" />
        <Text style={styles.loadingText}>Setting up database...</Text>
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <StackNavigator initialRouteName={initialRoute} />
    </View>
  );
}

const styles = ScaledSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: '20@vs',
    fontSize: '16@ms',
    color: '#3377FF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: '20@s',
  },
  errorText: {
    fontSize: '16@ms',
    color: 'red',
    textAlign: 'center',
    marginBottom: '20@vs',
  },
  retryText: {
    fontSize: '16@ms',
    color: '#3377FF',
    textDecorationLine: 'underline',
  },
});
export default App;
