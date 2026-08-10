import axios from 'axios'
import type { AxiosResponse, AxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@/config/api'

class APIBase {
  private baseUrl: string
  private axiosInstance = axios.create()

  constructor() {
    // Resolved from the current host — see src/config/api.ts.
    this.baseUrl = API_BASE_URL
    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        config.timeout = config.timeout || 15000
        return config
      },
      (error) => Promise.reject(error),
    )

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          window.dispatchEvent(new CustomEvent('auth:token-expired'))
        }
        return Promise.reject(error)
      },
    )
  }

  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}/${endpoint}`
  }

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    return headers
  }

  protected async get<T>(
    endpoint: string,
    headers?: Record<string, string>,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(endpoint)
    try {
      return await this.axiosInstance.get<T>(url, {
        headers: headers || this.getHeaders(),
        ...config,
      })
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data,
        }
      }
      throw { status: 500, message: 'Unknown error' }
    }
  }

  protected async post<T>(
    endpoint: string,
    data: unknown,
    headers?: Record<string, string>,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(endpoint)
    const isFormData = data instanceof FormData
    const finalHeaders = headers || this.getHeaders()

    if (isFormData) {
      delete finalHeaders['Content-Type']
    }

    try {
      return await this.axiosInstance.post<T>(url, data, {
        headers: finalHeaders,
        ...config,
      })
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data,
        }
      }
      throw { status: 500, message: 'Unknown error' }
    }
  }

  protected async put<T>(
    endpoint: string,
    data: unknown,
    headers?: Record<string, string>,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(endpoint)
    try {
      return await this.axiosInstance.put<T>(url, data, {
        headers: headers || this.getHeaders(),
        ...config,
      })
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data,
        }
      }
      throw { status: 500, message: 'Unknown error' }
    }
  }

  protected async patch<T>(
    endpoint: string,
    data: unknown,
    headers?: Record<string, string>,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(endpoint)
    try {
      return await this.axiosInstance.patch<T>(url, data, {
        headers: headers || this.getHeaders(),
        ...config,
      })
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data,
        }
      }
      throw { status: 500, message: 'Unknown error' }
    }
  }

  protected async delete<T>(
    endpoint: string,
    headers?: Record<string, string>,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(endpoint)
    try {
      return await this.axiosInstance.delete<T>(url, {
        headers: headers || this.getHeaders(),
        ...config,
      })
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data,
        }
      }
      throw { status: 500, message: 'Unknown error' }
    }
  }

  protected async delete_<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(endpoint)
    try {
      return await this.axiosInstance.delete<T>(url, {
        headers: headers || this.getHeaders(),
        data,
        ...config,
      })
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data,
        }
      }
      throw { status: 500, message: 'Unknown error' }
    }
  }
}

export default APIBase
