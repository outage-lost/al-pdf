"use client"

import { useState } from "react"
import { Minimize2, Download, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
import { PdfPreview } from "@/components/pdf-preview"
import { getApiConfig } from "@/lib/api-config"
import { ApiError } from "@/lib/api-client"

interface FileItem {
  id: string
  file: File
  preview?: string
}

interface QualityEstimate {
  quality: string
  estimated_size: number
  reduction_percentage: number
}

interface EstimatesResponse {
  original_size: number
  estimates: QualityEstimate[]
  tempid?: string
}

type Quality = "low" | "medium" | "high" | "extreme"

export default function CompressPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimates, setEstimates] = useState<EstimatesResponse | null>(null)
  // allow arbitrary quality tokens (backend may use 'media','alta', etc.)
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null)
  const [outputName, setOutputName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)

  const canGetEstimates = files.length === 1

  const formatFileSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return "N/A"
    if (typeof bytes !== "number" || !isFinite(bytes)) return "N/A"
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const handleGetEstimates = async () => {
    const config = getApiConfig()

    if (!canGetEstimates) {
      setError("Por favor sube exactamente 1 archivo PDF.")
      return
    }

    setIsLoadingEstimates(true)
    setError(null)
    setEstimates(null)
    setSelectedQuality(null)

    try {
      const formData = new FormData()
      formData.append("file", files[0].file)

      const response = await fetch(`${config.baseUrl}/compress/estimates`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let detail = "Error al obtener estimaciones de compresión"
        try {
          const errorData = await response.json()
          detail = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData) || detail
        } catch {
          try {
            const txt = await response.text()
            if (txt) detail = txt
          } catch {
            // Use default
          }
        }
        if (!detail) detail = `${response.status} ${response.statusText}`
        console.error(`[Compress] estimates responded ${response.status} ${response.statusText}:`, detail)
        throw new ApiError(detail, response.status, detail)
      }

      const data: any = await response.json()
      // Normalize tempid naming differences (tempid vs temp_id) and shape
      // Normalize estimates into an array of objects with a `quality` key
      const rawEst = data.estimates ?? data.estimate ?? {}
      let estimatesArray: any[] = []
      if (Array.isArray(rawEst)) {
        estimatesArray = rawEst.map((e: any) => ({
          quality: (e.quality ?? e.level ?? e.name ?? "").toString().toLowerCase(),
          estimated_size: e.estimated_size ?? e.size_bytes ?? e.size ?? NaN,
          reduction_percentage: e.reduction_percentage ?? e.reduction_percent ?? e.reduction ?? NaN,
          // keep original shape just in case
          raw: e,
        }))
      } else if (rawEst && typeof rawEst === "object") {
        estimatesArray = Object.keys(rawEst).map((k) => {
          const e = rawEst[k]
          return {
            quality: k.toString().toLowerCase(),
            estimated_size: e.estimated_size ?? e.size_bytes ?? e.size ?? NaN,
            reduction_percentage: e.reduction_percentage ?? e.reduction_percent ?? e.reduction ?? NaN,
            raw: e,
          }
        })
      }

      // Use actual file size if estimates.original_size is 0 (API may not return it)
      const actualFileSize = files[0]?.file?.size ?? 0
      const normalized: EstimatesResponse = {
        original_size: (data.original_size ?? data.originalSize) && (data.original_size ?? data.originalSize) > 0
          ? (data.original_size ?? data.originalSize)
          : actualFileSize,
        estimates: estimatesArray,
        tempid: data.tempid ?? data.temp_id ?? data.temp ?? undefined,
      }
      setEstimates(normalized)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.message)
      } else {
        setError(`Error de red. Por favor verifica tu conexión. ${String(err)}`)
      }
      console.error("[v0] Estimates error:", err)
    } finally {
      setIsLoadingEstimates(false)
    }
  }

  const handleCompress = async () => {
    const config = getApiConfig()

    if (!selectedQuality) {
      setError("Por favor selecciona un nivel de calidad.")
      return
    }

    setIsCompressing(true)
    setError(null)

    try {
      const formData = new FormData()

      // Always send file (required by backend)
      if (files[0]?.file) {
        formData.append("file", files[0].file)
      }

      // Note: tempid is not sent because backend has issues with it when it references
      // a file that may have been cleaned up. Simple approach: always re-upload file.

      // Map frontend quality keys (English or Spanish) to backend expected Spanish values
      const qualityMap: Record<string, string> = {
        low: "baja",
        medium: "media",
        high: "alta",
        extreme: "extrema",
        baja: "baja",
        media: "media",
        alta: "alta",
        extrema: "extrema",
      }

      // Derive a quality token that actually exists in the estimates payload when possible.
      let qualityValue = String(selectedQuality ?? "").toLowerCase()
      try {
        const raw = estimates?.estimates ?? []
        const arr = Array.isArray(raw) ? raw : [raw]
        const found = arr.find((e: any) => {
          const q = String(e?.quality ?? e?.level ?? "").toLowerCase()
          return q === qualityValue || q === (qualityMap[qualityValue] ?? "") || (qualityMap[q] === qualityValue)
        })
        if (found) {
          qualityValue = String(found.quality ?? found.level ?? qualityValue).toLowerCase()
        } else {
          qualityValue = qualityMap[qualityValue] ?? qualityValue
        }
      } catch (e) {
        qualityValue = qualityMap[qualityValue] ?? qualityValue
      }

      formData.append("quality", qualityValue)

      // Debug info - log parameters being sent
      try {
        const debugObj: Record<string, any> = {
          quality: qualityValue,
          hasFile: !!files[0]?.file,
          fileName: files[0]?.file?.name,
          fileSize: files[0]?.file?.size,
          note: "tempid NOT sent - backend issue with it, using simple file+quality"
        }

        console.log("[Compress] ===== REQUEST DEBUG =====")
        console.log(debugObj)
        console.log("[Compress] ========== END ==========")
      } catch (e) {
        console.error("[Compress] Debug logging error:", e)
      }

      const response = await fetch(`${config.baseUrl}/compress`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let detail = "Error al comprimir el PDF"
        try {
          const errorData = await response.json()
          detail = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData) || detail
        } catch (jsonErr) {
          try {
            const txt = await response.text()
            if (txt) detail = txt
          } catch {
            // fallback to default
          }
        }
        if (!detail) detail = `${response.status} ${response.statusText}`
        // Log full response for debugging in devtools - include FormData params sent
        console.error(`[Compress] server responded ${response.status} ${response.statusText}:`)
        console.error("[Compress] Error detail:", detail)
        console.error("[Compress] Note: Check if tempid or quality value is causing the issue")
        throw new ApiError(detail, response.status, detail)
      }

      const blob = await response.blob()
      setProcessedBlob(blob)
      setShowNameInput(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.message)
      } else {
        setError(`Error de red. Por favor verifica tu conexión. ${String(err)}`)
      }
      console.error("[v0] Compress error:", err)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleDownload = () => {
    if (!processedBlob) return

    const filename = outputName.trim() || "compressed.pdf"
    const finalFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`

    const url = window.URL.createObjectURL(processedBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = finalFilename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    // Reset for new operation after short delay so user can download multiple files
    setTimeout(() => {
      setFiles([])
      setProcessedBlob(null)
      setShowNameInput(false)
      setOutputName("")
      setEstimates(null)
      setSelectedQuality(null)
    }, 5000)
  }

  // User-requested labels: básica, media, alta, extrema
  const qualityLabelMap: Record<string, string> = {
    basica: "Básica",
    media: "Media",
    alta: "Alta",
    extrema: "Extrema",
    baja: "Básica",
    low: "Básica",
    medium: "Media",
    high: "Alta",
    extreme: "Extrema",
  }

  const qualityDescriptions: Record<string, string> = {
    basica: "Compresión ligera, mínima pérdida de calidad",
    baja: "Compresión ligera, mínima pérdida de calidad",
    media: "Compresión equilibrada y buena calidad",
    alta: "Compresión fuerte, pérdida visible de calidad",
    extrema: "Compresión extrema, máxima reducción de tamaño",
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Minimize2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Comprimir PDF</h1>
            <p className="text-muted-foreground">Reduce el tamaño del PDF manteniendo la calidad</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subir archivo PDF</CardTitle>
          <CardDescription>Sube un archivo PDF para comprimir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploadZone
            files={files}
            onFilesChange={setFiles}
            accept=".pdf"
            multiple={false}
            maxFiles={1}
            allowReorder={false}
            showPreview={false}
          />

          {files.length > 0 && files[0].preview && (
            <PdfPreview fileUrl={files[0].preview} fileName={files[0].file.name} />
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!estimates && !showNameInput && (
            <Button
              onClick={handleGetEstimates}
              disabled={!canGetEstimates || isLoadingEstimates}
              size="lg"
              className="w-full"
            >
              {isLoadingEstimates ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Obteniendo estimaciones...
                </>
              ) : (
                <>Obtener estimaciones de compresión</>
              )}
            </Button>
          )}

          {estimates && !showNameInput && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Info className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">
                  Tamaño original: <span className="font-semibold">{formatFileSize(estimates.original_size)}</span>
                </p>
              </div>

              <div className="space-y-3">
                <Label>Selecciona el nivel de calidad</Label>
                {(() => {
                  // Normalize estimates: backend may return different field names
                  const raw = estimates?.estimates
                    ? Array.isArray(estimates.estimates)
                      ? estimates.estimates
                      : [estimates.estimates]
                    : []
                  const estimateList = raw.map((e: any) => ({
                    quality: e.quality ?? e.level ?? "unknown",
                    estimated_size:
                      typeof e.estimated_size === "number"
                        ? e.estimated_size
                        : typeof e.size_bytes === "number"
                          ? e.size_bytes
                          : typeof e.size === "number"
                            ? e.size
                            : NaN,
                    reduction_percentage:
                      typeof e.reduction_percentage === "number"
                        ? e.reduction_percentage
                        : typeof e.reduction_percent === "number"
                          ? e.reduction_percent
                          : typeof e.reduction === "number"
                            ? e.reduction
                            : NaN,
                  }))

                  return estimateList.map((estimate, idx) => (
                    <button
                      key={`${estimate.quality ?? 'quality'}-${idx}`}
                      type="button"
                      onClick={() => setSelectedQuality(estimate.quality)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${selectedQuality === estimate.quality
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{qualityLabelMap[estimate.quality] ?? estimate.quality}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatFileSize(estimate.estimated_size)}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${Number.isFinite(estimate.reduction_percentage) && estimate.reduction_percentage > 50
                              ? "bg-green-500/20 text-green-600 dark:text-green-400"
                              : Number.isFinite(estimate.reduction_percentage) && estimate.reduction_percentage > 25
                                ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                : "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                              }`}
                          >
                            {Number.isFinite(estimate.reduction_percentage)
                              ? Number(estimate.reduction_percentage).toFixed(0)
                              : "N/A"}% reducción
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{qualityDescriptions[estimate.quality] ?? qualityDescriptions[(estimate.quality ?? '').toLowerCase()]}</p>
                    </button>
                  ))
                })()}
              </div>

              <Button
                onClick={handleCompress}
                disabled={!selectedQuality || isCompressing}
                size="lg"
                className="w-full"
              >
                {isCompressing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Comprimiendo...
                  </>
                ) : (
                  <>
                    <Minimize2 className="mr-2 h-4 w-4" />
                    Comprimir PDF
                  </>
                )}
              </Button>
            </div>
          )}

          {showNameInput && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <p className="text-sm font-medium">¡PDF comprimido correctamente!</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-name">Nombre de salida (opcional)</Label>
                <Input
                  id="output-name"
                  type="text"
                  placeholder="compressed.pdf"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                />
              </div>

              <Button onClick={handleDownload} size="lg" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF comprimido
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
