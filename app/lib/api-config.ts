"use client"

// Hardcoded API URL
const API_BASE_URL = "http://b06labs-apps.tail0df002.ts.net:8999"

export interface ApiConfig {
  baseUrl: string
  isConfigured: boolean
  isConnected: boolean
}

export function getApiConfig(): ApiConfig {
  return {
    baseUrl: API_BASE_URL,
    isConfigured: true,
    isConnected: true,
  }
}

export async function checkApiHealth(baseUrl?: string): Promise<boolean> {
  const url = baseUrl || API_BASE_URL
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
