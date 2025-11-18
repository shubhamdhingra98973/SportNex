/**
 *
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  StatusBar,
  useColorScheme,
  View
} from 'react-native';
import {
  SafeAreaProvider,

} from 'react-native-safe-area-context';
import LoginRegisterScreen from '@features/onboarding/LoginRegisterScreen';
import { ScaledSheet } from 'react-native-size-matters';
import StackNavigator from './src/navigation/StackNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  return (
    <View style={{flex: 1}}>
    <StackNavigator/>
    </View>
  );
}

const styles = ScaledSheet.create({
  container: {
    flex: 1,
  },
});
export default App;
