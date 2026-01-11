"use client"

export interface ApiConfig {
  baseUrl: string
  isConfigured: boolean
  isConnected: boolean
}

const STORAGE_KEY = "alpdf_api_url"

export function getApiConfig(): ApiConfig {
  if (typeof window === "undefined") {
    return { baseUrl: "", isConfigured: false, isConnected: false }
  }

  const storedUrl = localStorage.getItem(STORAGE_KEY)
  return {
    baseUrl: storedUrl || "",
    isConfigured: !!storedUrl,
    isConnected: false, // Will be checked dynamically
  }
}

export function setApiUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url)
}

export function clearApiUrl(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function checkApiHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    return response.ok
  } catch (error) {
    console.error("[v0] Health check failed:", error)
    return false
  }
}
