"use client"

import { useState } from "react"
import { FileUp, Download, AlertCircle, Info, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FileUploadZone } from "@/components/file-upload-zone"
import { getApiConfig } from "@/lib/api-config"
import { ApiError } from "@/lib/api-client"

interface FileItem {
  id: string
  file: File
  preview?: string
}

type MergeMode = "zip" | "merge"

export default function ConvertPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [mergeMode, setMergeMode] = useState<MergeMode>("zip")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputName, setOutputName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [resultType, setResultType] = useState<"pdf" | "zip">("zip")

  const canProcess = files.length >= 1
  const hasMultipleFiles = files.length > 1

  const handleConvert = async () => {
    const config = getApiConfig()

    if (!canProcess) {
      setError("Por favor sube al menos 1 archivo para convertir.")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((fileItem) => {
        formData.append("files", fileItem.file)
      })

      // Usar el nuevo endpoint /convert-merge-zip si hay múltiples archivos
      const endpoint = hasMultipleFiles ? "/convert-merge-zip" : "/convert"
      if (hasMultipleFiles) {
        formData.append("merge_mode", mergeMode)
      }

      const response = await fetch(`${config.baseUrl}${endpoint}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let detail = "Error al convertir los archivos a PDF"
        try {
          const errorData = await response.json()
          detail = errorData.detail || errorData.message || errorData.error || detail
        } catch {
          // Use default
        }
        throw new ApiError(detail, response.status, detail)
      }

      // Detectar tipo de resultado basado en Content-Type
      const contentType = response.headers.get("Content-Type")
      const isZipFile =
        contentType?.includes("zip") || (hasMultipleFiles && mergeMode === "zip")

      const blob = await response.blob()
      setProcessedBlob(blob)
      setResultType(isZipFile ? "zip" : "pdf")
      setShowNameInput(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.message)
      } else {
        setError(`Error de red. Por favor verifica tu conexión. ${String(err)}`)
      }
      console.error("[Convert] Error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!processedBlob) return

    let filename: string
    if (resultType === "zip") {
      filename = outputName.trim() || "converted-pdfs.zip"
      filename = filename.endsWith(".zip") ? filename : `${filename}.zip`
    } else {
      filename = outputName.trim() || "converted.pdf"
      filename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
    }

    const url = window.URL.createObjectURL(processedBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    // Reset for new operation
    setFiles([])
    setProcessedBlob(null)
    setShowNameInput(false)
    setOutputName("")
    setMergeMode("zip")
    setResultType("zip")
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <FileUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Convertir a PDF</h1>
            <p className="text-muted-foreground">
              Convierte imágenes y documentos a formato PDF
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subir archivos</CardTitle>
          <CardDescription>Sube imágenes o documentos para convertirlos a PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Tipos de archivo soportados:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Imágenes: JPG, JPEG, PNG, GIF, BMP, TIFF</li>
                <li>Documentos: DOCX, DOC, TXT</li>
                <li>Hojas de cálculo: XLSX, XLS</li>
                <li>Presentaciones: PPTX, PPT</li>
              </ul>
            </div>
          </div>

          <FileUploadZone
            files={files}
            onFilesChange={setFiles}
            accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.docx,.doc,.txt,.xlsx,.xls,.pptx,.ppt"
            multiple
            allowReorder
            showPreview={false}
          />

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {hasMultipleFiles && !showNameInput && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Opciones de descarga</CardTitle>
                <CardDescription>
                  Elige cómo descargar los archivos convertidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={mergeMode} onValueChange={(value) => setMergeMode(value as MergeMode)}>
                  <div className="flex items-center space-x-3 mb-4">
                    <RadioGroupItem value="zip" id="mode-zip" />
                    <Label htmlFor="mode-zip" className="cursor-pointer flex-1">
                      <div className="font-medium">Descargar como ZIP</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Todos los PDFs comprimidos en un archivo ZIP
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="merge" id="mode-merge" />
                    <Label htmlFor="mode-merge" className="cursor-pointer flex-1">
                      <div className="font-medium">Agrupar en un solo PDF</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Todos los archivos convertidos se unirán en un único PDF
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {!showNameInput ? (
            <Button
              onClick={handleConvert}
              disabled={!canProcess || isProcessing}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Convirtiendo...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Convertir a PDF
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <p className="text-sm font-medium">
                  {resultType === "zip"
                    ? "¡Archivos convertidos correctamente!"
                    : "¡Archivos agrupados correctamente!"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-name">Nombre de salida (opcional)</Label>
                <Input
                  id="output-name"
                  type="text"
                  placeholder={resultType === "zip" ? "converted-pdfs" : "merged.pdf"}
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                />
              </div>

              <Button onClick={handleDownload} size="lg" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {resultType === "zip" ? "Descargar ZIP" : "Descargar PDF"}
              </Button>

              <Button
                onClick={() => {
                  setFiles([])
                  setProcessedBlob(null)
                  setShowNameInput(false)
                  setOutputName("")
                  setMergeMode("zip")
                }}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Convertir otro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
