import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from 'utils/logger';

/**
 * Reusable API Client
 *
 * Provides a singleton HTTP client with:
 * - Structured logging using utils/logger
 * - GET/POST methods with consistent error handling
 * - Configurable base URL
 * - Request/response interceptors support
 * - Performance tracking
 *
 * Usage:
 * ```typescript
 * const apiClient = ApiClient.getInstance();
 *
 * // With default base URL (from Config)
 * const data = await apiClient.get('/endpoint');
 * const result = await apiClient.post('/endpoint', { key: 'value' });
 *
 * // With custom base URL
 * const customClient = ApiClient.getInstance('https://custom-api.com');
 * ```
 */
export class ApiClient {
  private static instances: Map<string, ApiClient> = new Map();
  private axiosInstance: AxiosInstance;
  private baseURL: string;
  private scopedLogger = logger.createScoped('ApiClient');

  private constructor(baseURL?: string) {
    this.baseURL = baseURL || '';
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds default timeout
    });

    // Setup request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const url = this.getFullUrl(config.url || '', config.baseURL);
        this.scopedLogger.debug(`[${config.method?.toUpperCase()}] ${url}`, {
          params: config.params,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.scopedLogger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Setup response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const url = this.getFullUrl(response.config.url || '', response.config.baseURL);
        this.scopedLogger.debug(`[${response.config.method?.toUpperCase()}] ${url} success`, {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get singleton instance of ApiClient
   * @param baseURL Optional base URL. If not provided, uses empty string (caller must provide full URL)
   * @returns ApiClient instance
   */
  static getInstance(baseURL?: string): ApiClient {
    const key = baseURL || 'default';
    if (!ApiClient.instances.has(key)) {
      ApiClient.instances.set(key, new ApiClient(baseURL));
    }
    return ApiClient.instances.get(key)!;
  }

  /**
   * Configure axios instance (e.g., add headers, auth tokens)
   */
  configure(config: AxiosRequestConfig): void {
    Object.assign(this.axiosInstance.defaults, config);
    this.scopedLogger.info('Axios instance configured', config);
  }

  /**
   * GET request
   * @param endpoint API endpoint (relative to baseURL or absolute)
   * @param config Optional axios request config
   * @returns Response data
   */
  async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const start = Date.now();

    try {
      this.scopedLogger.info(`[GET] ${url}`, config?.params);
      const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, config);
      const duration = Date.now() - start;
      this.scopedLogger.info(`[GET] ${url} completed in ${duration}ms`, {
        status: response.status,
      });
      return response.data;
    } catch (error: any) {
      this.logHttpError(error, 'GET', url, start);
      throw error;
    }
  }

  /**
   * POST request
   * @param endpoint API endpoint (relative to baseURL or absolute)
   * @param body Request body
   * @param config Optional axios request config
   * @returns Response data
   */
  async post<T = any>(
    endpoint: string,
    body?: Record<string, any>,
    config?: AxiosRequestConfig,
    disableLogging?: boolean
  ): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const start = Date.now();

    try {
      if (!disableLogging) {
        this.scopedLogger.info(`[POST] ${url}`, body);
      }
      const response: AxiosResponse<T> = await this.axiosInstance.post(endpoint, body, config);
      const duration = Date.now() - start;
      if (!disableLogging) {
        this.scopedLogger.info(`[POST] ${url} completed in ${duration}ms`, {
          status: response.status,
        });
      }
      return response.data;
    } catch (error: any) {
      if (!disableLogging) {
        this.logHttpError(error, 'POST', url, start);
      }
      throw error;
    }
  }

  /**
   * PUT request
   * @param endpoint API endpoint (relative to baseURL or absolute)
   * @param body Request body
   * @param config Optional axios request config
   * @returns Response data
   */
  async put<T = any>(
    endpoint: string,
    body?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const start = Date.now();

    try {
      this.scopedLogger.info(`[PUT] ${url}`, body);
      const response: AxiosResponse<T> = await this.axiosInstance.put(endpoint, body, config);
      const duration = Date.now() - start;
      this.scopedLogger.info(`[PUT] ${url} completed in ${duration}ms`, {
        status: response.status,
      });
      return response.data;
    } catch (error: any) {
      this.logHttpError(error, 'PUT', url, start);
      throw error;
    }
  }

  /**
   * DELETE request
   * @param endpoint API endpoint (relative to baseURL or absolute)
   * @param config Optional axios request config
   * @returns Response data
   */
  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const start = Date.now();

    try {
      this.scopedLogger.info(`[DELETE] ${url}`);
      const response: AxiosResponse<T> = await this.axiosInstance.delete(endpoint, config);
      const duration = Date.now() - start;
      this.scopedLogger.info(`[DELETE] ${url} completed in ${duration}ms`, {
        status: response.status,
      });
      return response.data;
    } catch (error: any) {
      this.logHttpError(error, 'DELETE', url, start);
      throw error;
    }
  }

  /**
   * PATCH request
   * @param endpoint API endpoint (relative to baseURL or absolute)
   * @param body Request body
   * @param config Optional axios request config
   * @returns Response data
   */
  async patch<T = any>(
    endpoint: string,
    body?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const start = Date.now();

    try {
      this.scopedLogger.info(`[PATCH] ${url}`, body);
      const response: AxiosResponse<T> = await this.axiosInstance.patch(endpoint, body, config);
      const duration = Date.now() - start;
      this.scopedLogger.info(`[PATCH] ${url} completed in ${duration}ms`, {
        status: response.status,
      });
      return response.data;
    } catch (error: any) {
      this.logHttpError(error, 'PATCH', url, start);
      throw error;
    }
  }

  /**
   * Get the underlying axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Get current base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Set base URL (creates new instance if needed)
   */
  setBaseURL(baseURL: string): void {
    if (this.baseURL !== baseURL) {
      this.baseURL = baseURL;
      this.axiosInstance.defaults.baseURL = baseURL;
      this.scopedLogger.info('Base URL updated', { baseURL });
    }
  }

  // ========================================================
  // 🔧 PRIVATE HELPERS
  // ========================================================

  private getFullUrl(endpoint: string, configBaseURL?: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const base = configBaseURL || this.baseURL;
    return base ? `${base}${endpoint}` : endpoint;
  }

  private logHttpError(error: any, method?: string, url?: string, startTime?: number): void {
    const duration = startTime ? Date.now() - startTime : undefined;
    const methodStr = method || error?.config?.method?.toUpperCase() || 'UNKNOWN';
    const urlStr = url || this.getFullUrl(error?.config?.url || '', error?.config?.baseURL);

    const errorDetails: any = {
      message: error?.message,
      status: error?.response?.status ?? 'N/A',
      statusText: error?.response?.statusText,
      responseData: error?.response?.data,
    };

    if (duration !== undefined) {
      errorDetails.duration = `${duration}ms`;
    }

    this.scopedLogger.error(
      `[${methodStr}] ${urlStr} failed${duration ? ` after ${duration}ms` : ''}`,
      errorDetails
    );
  }
}
