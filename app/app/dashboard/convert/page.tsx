"use client"

import { useState } from "react"
import { FileUp, Download, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
import { getApiConfig } from "@/lib/api-config"
import { ApiError } from "@/lib/api-client"

interface FileItem {
  id: string
  file: File
  preview?: string
}

export default function ConvertPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputName, setOutputName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [isZip, setIsZip] = useState(false)

  const canProcess = files.length >= 1

  const handleConvert = async () => {
    const config = getApiConfig()

    if (!config.isConfigured) {
      setError("API no configurada. Por favor configúrala en Ajustes.")
      return
    }

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

      const response = await fetch(`${config.baseUrl}/convert`, {
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

      // Detect if response is PDF or ZIP based on Content-Type
      const contentType = response.headers.get("Content-Type")
      const isZipFile = contentType?.includes("zip") || files.length > 1

      const blob = await response.blob()
      setProcessedBlob(blob)
      setIsZip(isZipFile)
      setShowNameInput(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.message)
      } else {
        setError(`Error de red. Por favor verifica tu conexión. ${String(err)}`)
      }
      console.error("[v0] Convert error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!processedBlob) return

    let filename: string
    if (isZip) {
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
    setIsZip(false)
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
            <p className="text-muted-foreground">Convierte imágenes y documentos a formato PDF</p>
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

          {files.length > 1 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <Info className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">Los múltiples archivos se devolverán en un archivo ZIP</p>
            </div>
          )}

          {!showNameInput ? (
            <Button onClick={handleConvert} disabled={!canProcess || isProcessing} size="lg" className="w-full">
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
                  {isZip ? "¡Archivos convertidos correctamente!" : "¡Archivo convertido correctamente!"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-name">Nombre de salida (opcional)</Label>
                <Input
                  id="output-name"
                  type="text"
                  placeholder={isZip ? "converted-pdfs.zip" : "converted.pdf"}
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                />
              </div>

              <Button onClick={handleDownload} size="lg" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {isZip ? "Descargar ZIP" : "Descargar PDF"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
