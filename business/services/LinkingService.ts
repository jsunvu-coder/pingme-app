import { Linking } from 'react-native';
import { navigationRef } from '../../navigation/Navigation';
import { findRouteByPath, extractRouteParams } from '../DeepLinkRoutes';

export interface DeepLinkParams {
  screen?: string;
  [key: string]: any;
}

export class LinkingService {
  private static instance: LinkingService;
  private isInitialized = false;

  public static getInstance(): LinkingService {
    if (!LinkingService.instance) {
      LinkingService.instance = new LinkingService();
    }
    return LinkingService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Listen for incoming deep links when app is already running
      Linking.addEventListener('url', this.handleDeepLink);

      // Check if app was opened with a deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && this.isValidDeepLink(initialUrl)) {
        // Delay navigation to ensure navigation is ready
        setTimeout(() => {
          this.handleDeepLink({ url: initialUrl });
        }, 1000);
      }
    } catch (error) {
      console.warn('Error initializing deep linking:', error);
    }

    this.isInitialized = true;
  }

  private isValidDeepLink(url: string): boolean {
    return (
      url.startsWith('pingme://') || url.startsWith('https://pingme.app/') || url.includes('/--/')
    );
  }

  private handleDeepLink = (event: { url: string }): void => {
    // Skip invalid or empty URLs
    if (!event.url || typeof event.url !== 'string') {
      return;
    }

    try {
      const { screen, params } = this.parseDeepLink(event.url);

      if (screen && navigationRef.isReady()) {
        this.navigateToScreen(screen, params);
      }
    } catch (error) {
      // Silently ignore unsupported URL schemes to prevent errors on app startup
      console.warn('Skipping unsupported URL:', event.url);
    }
  };

  private parseDeepLink(url: string): { screen: string; params: DeepLinkParams } {
    let path = '';
    let queryParams: DeepLinkParams = {};

    // Validate URL format
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL');
    }

    if (url.startsWith('pingme://')) {
      // Custom scheme: pingme://path?param=value
      const urlObj = new URL(url);
      path = urlObj.pathname.substring(1); // Remove leading slash
      queryParams = this.parseQueryParams(urlObj.search);
    } else if (url.startsWith('https://pingme.app/')) {
      // Universal link: https://pingme.app/path?param=value
      const urlObj = new URL(url);
      path = urlObj.pathname.substring(1); // Remove leading slash
      queryParams = this.parseQueryParams(urlObj.search);
    } else if (url.includes('/--/')) {
      // Expo development URL: exp://192.168.1.100:8081/--/path?param=value
      const pathStart = url.indexOf('/--/') + 4;
      const pathAndQuery = url.substring(pathStart);
      const pathQueryParts = pathAndQuery.split('?');
      path = pathQueryParts[0];
      if (pathQueryParts.length > 1) {
        queryParams = this.parseQueryParams('?' + pathQueryParts[1]);
      }
    } else {
      throw new Error('Unsupported URL scheme');
    }

    // Find route configuration
    const route = findRouteByPath(path);

    if (!route) {
      return { screen: 'MainTab', params: queryParams };
    }

    // Extract dynamic parameters from path
    const routeParams = extractRouteParams(path, route.path);

    // Merge route params, query params, and default params
    const allParams = {
      ...route.params,
      ...routeParams,
      ...queryParams,
    };

    return { screen: route.screen, params: allParams };
  }

  private parseQueryParams(search: string): DeepLinkParams {
    const params: DeepLinkParams = {};

    if (search) {
      const urlSearchParams = new URLSearchParams(search);
      urlSearchParams.forEach((value, key) => {
        // Try to parse as JSON for complex objects
        try {
          params[key] = JSON.parse(value);
        } catch {
          // If not JSON, use as string
          params[key] = value;
        }
      });
    }

    return params;
  }

  private navigateToScreen(screenName: string, params: DeepLinkParams): void {
    // Special handling for MainTab navigation
    if (screenName === 'MainTab') {
      if (params.tab) {
        // @ts-ignore
        navigationRef.navigate('MainTab', {
          screen: params.tab,
          params: params,
        });
      } else {
        // @ts-ignore
        navigationRef.navigate('MainTab', params);
      }
    } else {
      // @ts-ignore
      navigationRef.navigate(screenName, params);
    }
  }

  // Public method to generate deep links
  public generateDeepLink(path: string, params: DeepLinkParams = {}): string {
    const baseUrl = 'pingme://';
    const queryString = this.buildQueryString(params);

    return `${baseUrl}${path}${queryString}`;
  }

  public generateUniversalLink(path: string, params: DeepLinkParams = {}): string {
    const baseUrl = 'https://pingme.app/';
    const queryString = this.buildQueryString(params);

    return `${baseUrl}${path}${queryString}`;
  }

  private buildQueryString(params: DeepLinkParams): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Convert objects to JSON strings
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        searchParams.append(key, stringValue);
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  public cleanup(): void {
    Linking.removeAllListeners('url');
    this.isInitialized = false;
  }
}

export default LinkingService;
