"use client"

// Determinar URL base dinámicamente - Solo en cliente
function getBaseUrl(): string {
  // Solo usar window (cliente), nunca process.env en tiempo de ejecución
  if (typeof window === "undefined") {
    // SSR: usar fallback
    return "http://localhost:8999"
  }

  const hostname = window.location.hostname
  const protocol = window.location.protocol

  // 1. Si es localhost o 127.0.0.1, usar localhost:8999 (desarrollo local)
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8999"
  }

  // 2. Si está en Docker y accede desde otro contenedor (hostname = api)
  if (hostname === "api") {
    return "http://api:8999"
  }

  // 3. Si tiene puerto custom (ej: localhost:3001), usar localhost:8999
  if (hostname.includes(".") === false && hostname !== "localhost") {
    return "http://localhost:8999"
  }

  // 4. Para producción/VPS, construir URL con mismo protocolo y dominio
  // ej: https://mi-dominio.com → https://api.mi-dominio.com:8999
  // o si no hay subdominio: https://mi-dominio.com:8999
  const port = window.location.port ? `:${window.location.port}` : ""
  return `${protocol}//${hostname}${port}`
}

export interface ApiConfig {
  baseUrl: string
  isConfigured: boolean
  isConnected: boolean
}

export function getApiConfig(): ApiConfig {
  const baseUrl = getBaseUrl()

  return {
    baseUrl,
    isConfigured: true,
    isConnected: true,
  }
}

export async function checkApiHealth(baseUrl?: string): Promise<boolean> {
  const url = baseUrl || getBaseUrl()
  try {
    const response = await fetch(`${url}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    return response.ok
  } catch (error) {
    console.error("[ALPDF] Health check failed:", error)
    return false
  }
}
