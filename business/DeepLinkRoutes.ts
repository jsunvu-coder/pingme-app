// Deep Link Routes Configuration
export interface DeepLinkRoute {
  path: string;
  screen: string;
  params?: Record<string, any>;
}

export const DEEP_LINK_ROUTES: DeepLinkRoute[] = [
  { path: 'claim-payment', screen: 'ClaimPaymentScreen' },
  { path: 'claim-payment/:paymentId', screen: 'ClaimPaymentScreen' },
];

// Helper function to find route by path
export const findRouteByPath = (path: string): DeepLinkRoute | undefined => {
  return DEEP_LINK_ROUTES.find((route) => {
    // Handle dynamic routes with parameters
    if (route.path.includes(':')) {
      const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(path);
    }
    return route.path === path;
  });
};

// Helper function to extract parameters from dynamic routes
export const extractRouteParams = (path: string, routePath: string): Record<string, string> => {
  const params: Record<string, string> = {};

  if (!routePath.includes(':')) {
    return params;
  }

  const pathSegments = path.split('/');
  const routeSegments = routePath.split('/');

  routeSegments.forEach((segment, index) => {
    if (segment.startsWith(':')) {
      const paramName = segment.substring(1);
      const paramValue = pathSegments[index];
      if (paramValue) {
        params[paramName] = paramValue;
      }
    }
  });

  return params;
};

export default DEEP_LINK_ROUTES;
