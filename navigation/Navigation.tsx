import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

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
    index: Math.max(0, routes.length - 1),
    routes,
  });
};

// Reset to MainTab, then present a screen (e.g., modal) on top.
export const presentOverMain = (name: string, params?: any) => {
  const isHomeScreenOnTop =
      navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'Home';
  const isPingNowScreenOnTop =
      navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'Ping Now';
  const isAirdropScreenOnTop =
      navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'Airdrop';
  const isAccountScreenOnTop =
      navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'Account';
  const isHongBaoOnTop =
      navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'HongBao';
  
  console.log('navigationRef.getCurrentRoute()?.name', navigationRef.getCurrentRoute()?.name);
  

  const isMainTabOnTop = isHomeScreenOnTop || isPingNowScreenOnTop || isAirdropScreenOnTop || isAccountScreenOnTop || isHongBaoOnTop;
  if (!isMainTabOnTop) {
    setRootScreen(['MainTab']);
  } 
  
  // Defer navigation to next tick to allow reset to apply
  setTimeout(() => {
    push(name, params);
  }, 0);
};

export const replace = (name: string, params?: any) => {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.replace(name, params));
  }
};
