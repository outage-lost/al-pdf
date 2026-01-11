"use client"

import { useState, useEffect } from "react"
import { X, Settings, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getApiConfig, setApiUrl, checkApiHealth } from "@/lib/api-config"

interface ConfigPanelProps {
  isOpen: boolean
  onClose: () => void
  onConfigChange: () => void
}

export function ConfigPanel({ isOpen, onClose, onConfigChange }: ConfigPanelProps) {
  const [url, setUrl] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connected" | "error" | "unconfigured">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const config = getApiConfig()
    setUrl(config.baseUrl)
    if (config.isConfigured) {
      checkConnection(config.baseUrl)
    } else {
      setConnectionStatus("unconfigured")
    }
  }, [isOpen])

  const checkConnection = async (testUrl: string) => {
    if (!testUrl) {
      setConnectionStatus("unconfigured")
      return
    }

    setIsChecking(true)
    setErrorMessage("")

    const isHealthy = await checkApiHealth(testUrl)

    setIsChecking(false)
    if (isHealthy) {
      setConnectionStatus("connected")
    } else {
      setConnectionStatus("error")
      setErrorMessage("No se pudo conectar a la API. Verifica la URL.")
    }
  }

  const handleSave = async () => {
    if (!url.trim()) {
      setErrorMessage("Por favor ingresa una URL válida")
      return
    }

    const trimmedUrl = url.trim().replace(/\/$/, "") // Remove trailing slash

    setIsChecking(true)
    const isHealthy = await checkApiHealth(trimmedUrl)

    if (isHealthy) {
      setApiUrl(trimmedUrl)
      setConnectionStatus("connected")
      setErrorMessage("")
      onConfigChange()
    } else {
      setConnectionStatus("error")
      setErrorMessage("No se pudo conectar a la API. Verifica la URL.")
    }
    setIsChecking(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Configuración API</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">URL base de la API</Label>
            <Input
              id="api-url"
              type="url"
              placeholder="https://api.ejemplo.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isChecking}
            />
            <p className="text-xs text-muted-foreground">Ingresa la URL base de tu servidor ALPDF</p>
          </div>

          {connectionStatus !== "idle" && connectionStatus !== "unconfigured" && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${connectionStatus === "connected"
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
            >
              {connectionStatus === "connected" ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Conexión exitosa</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{errorMessage}</span>
                </>
              )}
            </div>
          )}

          {connectionStatus === "unconfigured" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Aún no hay API configurada</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isChecking} className="flex-1">
              {isChecking ? "Probando..." : "Guardar y probar conexión"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
