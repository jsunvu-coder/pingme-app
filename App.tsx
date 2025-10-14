import './global.css';
import RootNavigator from 'navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from 'navigation/Navigation';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinkingService } from 'business/services/LinkingService';

export default function App() {
  useEffect(() => {
    // Initialize deep linking service
    const linkingService = LinkingService.getInstance();
    linkingService.initialize();

    // Cleanup on unmount
    return () => {
      linkingService.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
