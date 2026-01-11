"use client"

import { getApiConfig } from "./api-config"

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public detail?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const config = getApiConfig()
  const url = `${config.baseUrl}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
      },
    })

    if (!response.ok) {
      let detail = "Ocurrió un error"
      try {
        const errorData = await response.json()
        detail = errorData.detail || errorData.message || errorData.error || detail
      } catch {
        // If parsing fails, use default message
      }
      throw new ApiError(`Solicitud fallida: ${response.statusText}`, response.status, detail)
    }

    return response as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError("Error de red. Verifica tu conexión y la URL de la API.")
  }
}

export async function downloadFile(response: Response, defaultFilename: string) {
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = defaultFilename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
