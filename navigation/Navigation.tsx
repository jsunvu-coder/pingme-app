import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const NavigationOptions = {
  isPresent: true,
};

export const push = (name: string, params?: any) => {
  if (navigationRef.isReady()) {
    NavigationOptions.isPresent = false;
    // @ts-ignore
    navigationRef.navigate(name, params);
  }
};

export const present = (name: string, params?: any) => {
  if (navigationRef.isReady()) {
    NavigationOptions.isPresent = true;

    // @ts-ignore
    navigationRef.navigate(name, params);
  }
};

export const goBack = () => {
  if (navigationRef.isReady()) {
    // @ts-ignore
    navigationRef.goBack();
  }
};

export const setRootScreen = (items: (string | { name: string; params?: any })[]) => {
  const routes = items.map((it) =>
    typeof it === 'string' ? { name: it } : { name: it.name, params: it.params }
  );

  navigationRef.reset({
    index: 0,
    routes,
  });
};

// Reset to MainTab, then present a screen (e.g., modal) on top.
export const presentOverMain = (name: string, params?: any) => {
  setRootScreen(['MainTab']);
  // Defer navigation to next tick to allow reset to apply
  setTimeout(() => {
    push(name, params);
  }, 0);
};
