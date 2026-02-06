"use client"

import { useState, useEffect } from "react"
import { Combine, Download, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
import { PdfThumbnailPreview } from "@/components/pdf-thumbnail-preview"
import { getApiConfig } from "@/lib/api-config"
import { ApiError } from "@/lib/api-client"

interface FileItem {
  id: string
  file: File
  preview?: string
  fileId?: string
  pageCount?: number
}

export default function MergePage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputName, setOutputName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [loadingFileIds, setLoadingFileIds] = useState<Set<string>>(new Set())

  const canProcess = files.length >= 2

  // Cargar información de cada PDF cuando se sube
  useEffect(() => {
    const loadPdfInfo = async () => {
      const config = getApiConfig()
      const newFiles = [...files]
      let updated = false

      for (const fileItem of newFiles) {
        if (!fileItem.fileId && !loadingFileIds.has(fileItem.id)) {
          setLoadingFileIds((prev) => new Set(prev).add(fileItem.id))

          try {
            const formData = new FormData()
            formData.append("file", fileItem.file)

            const response = await fetch(`${config.baseUrl}/preview-upload`, {
              method: "POST",
              body: formData,
            })

            if (response.ok) {
              const data = await response.json()
              fileItem.fileId = data.file_id
              fileItem.pageCount = data.page_count
              updated = true
            }
          } catch (err) {
            console.error("Error loading PDF info:", err)
          }

          setLoadingFileIds((prev) => {
            const next = new Set(prev)
            next.delete(fileItem.id)
            return next
          })
        }
      }

      if (updated) {
        setFiles(newFiles)
      }
    }

    if (files.length > 0) {
      loadPdfInfo()
    }
  }, [files])

  const handleMerge = async () => {
    const config = getApiConfig()

    if (!canProcess) {
      setError("Por favor sube al menos 2 archivos PDF para unir.")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((fileItem) => {
        formData.append("files", fileItem.file)
      })

      const response = await fetch(`${config.baseUrl}/merge`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let detail = "Error al unir los PDFs"
        try {
          const errorData = await response.json()
          detail = errorData.detail || errorData.message || errorData.error || detail
        } catch {
          // Use default
        }
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
      console.error("[v0] Merge error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!processedBlob) return

    const filename = outputName.trim() || "merged.pdf"
    const finalFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`

    const url = window.URL.createObjectURL(processedBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = finalFilename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    // Reset for new operation
    setFiles([])
    setProcessedBlob(null)
    setShowNameInput(false)
    setOutputName("")
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Combine className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Unir PDFs</h1>
            <p className="text-muted-foreground">Combina varios archivos PDF en un solo documento</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subir archivos PDF</CardTitle>
          <CardDescription>Sube 2 o más archivos PDF para unir. Arrastra para reordenarlos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploadZone files={files} onFilesChange={setFiles} accept=".pdf" multiple allowReorder showPreview={false} />

          {/* Preview de miniaturas */}
          {files.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">
                Vista previa de PDFs ({files.length})
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((fileItem) => (
                  <div key={fileItem.id} className="space-y-2">
                    {fileItem.fileId && fileItem.pageCount ? (
                      <PdfThumbnailPreview
                        fileId={fileItem.fileId}
                        pageCount={fileItem.pageCount}
                        fileName={fileItem.file.name}
                        compact={true}
                        onRemove={() => {
                          setFiles(files.filter((f) => f.id !== fileItem.id))
                        }}
                      />
                    ) : (
                      <Card className="relative overflow-hidden bg-muted">
                        <CardContent className="p-0 w-full aspect-[3/4] flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Cargando...</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!showNameInput ? (
            <Button onClick={handleMerge} disabled={!canProcess || isProcessing} size="lg" className="w-full">
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Combine className="mr-2 h-4 w-4" />
                  Unir PDFs
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <p className="text-sm font-medium">¡PDF unido correctamente!</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-name">Nombre de salida (opcional)</Label>
                <Input
                  id="output-name"
                  type="text"
                  placeholder="merged.pdf"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                />
              </div>

              <Button onClick={handleDownload} size="lg" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF unido
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
