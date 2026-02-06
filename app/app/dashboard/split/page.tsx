"use client"

import { useState, useEffect } from "react"
import { Split, Download, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
import { PdfThumbnailPreview } from "@/components/pdf-thumbnail-preview"
import { getApiConfig } from "@/lib/api-config"
import { ApiError } from "@/lib/api-client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface FileItem {
  id: string
  file: File
  preview?: string
}

type SplitType = "pages" | "parts" | "pagesperpart" | "select"

export default function SplitPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [splitType, setSplitType] = useState<SplitType>("select")
  const [customParts, setCustomParts] = useState("")
  const [pagesPerPart, setPagesPerPart] = useState("")
  const [selectedPages, setSelectedPages] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputName, setOutputName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [pdfFileId, setPdfFileId] = useState<string | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState(0)

  const canProcess = files.length === 1

  // Cargar información del PDF cuando se sube
  useEffect(() => {
    if (!canProcess) return

    const loadPdfInfo = async () => {
      try {
        const config = getApiConfig()
        const formData = new FormData()
        formData.append("file", files[0].file)

        const response = await fetch(`${config.baseUrl}/preview-upload`, {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          setPdfFileId(data.file_id)
          setPdfPageCount(data.page_count)
        }
      } catch (err) {
        console.error("Error loading PDF info:", err)
      }
    }

    loadPdfInfo()
  }, [files, canProcess])

  const handleSplit = async () => {
    const config = getApiConfig()

    if (!canProcess) {
      setError("Por favor sube exactamente 1 archivo PDF para dividir.")
      return
    }

    // Validar según el tipo de división
    if (splitType === "parts") {
      const parts = Number.parseInt(customParts)
      if (!parts || parts < 2) {
        setError("Por favor ingresa un número válido de partes (mínimo 2).")
        return
      }
    } else if (splitType === "pagesperpart") {
      const pages = Number.parseInt(pagesPerPart)
      if (!pages || pages < 1) {
        setError("Por favor ingresa un número válido de páginas por parte (mínimo 1).")
        return
      }
    } else if (splitType === "select") {
      if (!selectedPages.trim()) {
        setError("Por favor especifica las páginas a extraer (ej: 1,3,5-7).")
        return
      }
    }

    setIsProcessing(true)
    setError(null)

    try {
      const file = files[0]?.file
      if (!file || !(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
        throw new ApiError("El archivo debe ser un PDF válido.")
      }

      const formData = new FormData()
      formData.append("file", file)

      let endpoint = `${config.baseUrl}/split`

      // Usar endpoint específico para selección de páginas
      if (splitType === "select") {
        endpoint = `${config.baseUrl}/split-select-pages`
        formData.append("pages", selectedPages.trim())
      } else {
        const mapSplitType = (t: SplitType) => {
          if (t === "pages") return "individual_pages"
          if (t === "parts") return "customparts"
          if (t === "pagesperpart") return "pagesperpart"
          return t
        }

        formData.append("splittype", mapSplitType(splitType))

        if (splitType === "parts") {
          formData.append("customparts", customParts)
        } else if (splitType === "pagesperpart") {
          formData.append("pagesperpart", pagesPerPart)
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let detail = splitType === "select"
          ? "Error al extraer las páginas seleccionadas"
          : "Error al dividir el PDF"
        try {
          const ct = response.headers.get("content-type") || ""
          if (ct.includes("application/json")) {
            const errorData = await response.json()
            detail = errorData.detail || errorData.message || errorData.error || detail
          }
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
      console.error("[Split] Error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!processedBlob) return

    const filename = outputName.trim() || (splitType === "select" ? "extracted.pdf" : "split-pdfs.zip")
    const finalFilename =
      splitType === "select"
        ? filename.endsWith(".pdf") ? filename : `${filename}.pdf`
        : filename.endsWith(".zip") ? filename : `${filename}.zip`

    const url = window.URL.createObjectURL(processedBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = finalFilename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    // Reset
    setTimeout(() => {
      setFiles([])
      setProcessedBlob(null)
      setShowNameInput(false)
      setOutputName("")
      setSelectedPages("")
      setCustomParts("")
      setPagesPerPart("")
      setPdfFileId(null)
      setPdfPageCount(0)
    }, 500)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Split className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Dividir / Extraer PDF</h1>
            <p className="text-muted-foreground">Divide un PDF o extrae páginas específicas</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subir archivo PDF</CardTitle>
          <CardDescription>Sube un archivo PDF para dividirlo o extraer páginas</CardDescription>
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

          {pdfFileId && pdfPageCount > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                📄 Total de páginas: <span className="font-bold text-foreground">{pdfPageCount}</span>
              </div>
              <PdfThumbnailPreview
                fileId={pdfFileId}
                pageCount={pdfPageCount}
                fileName={files[0]?.file.name || "PDF"}
                compact={false}
              />
            </div>
          )}

          <div className="space-y-4">
            <Label>Método de división / extracción</Label>
            <RadioGroup value={splitType} onValueChange={(value) => setSplitType(value as SplitType)}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="select" id="select" />
                <Label htmlFor="select" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Seleccionar páginas específicas</p>
                    <p className="text-xs text-muted-foreground">Extrae solo las páginas que indiques</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="pages" id="pages" />
                <Label htmlFor="pages" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Cada página como PDF separado</p>
                    <p className="text-xs text-muted-foreground">Divide cada página en archivos PDF individuales</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="parts" id="parts" />
                <Label htmlFor="parts" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Dividir en partes iguales</p>
                    <p className="text-xs text-muted-foreground">Divide el PDF en un número específico de partes</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="pagesperpart" id="pagesperpart" />
                <Label htmlFor="pagesperpart" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Páginas por parte</p>
                    <p className="text-xs text-muted-foreground">Divide en partes con X páginas cada una</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {splitType === "select" && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="selected-pages">Páginas a extraer</Label>
                <Input
                  id="selected-pages"
                  type="text"
                  placeholder="p.ej., 1,3,5-7,10"
                  value={selectedPages}
                  onChange={(e) => setSelectedPages(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: números separados por comas. Usa guiones para rangos (ej: 1,3,5-7)
                </p>
              </div>
            )}

            {splitType === "parts" && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="custom-parts">Número de partes</Label>
                <Input
                  id="custom-parts"
                  type="number"
                  min="2"
                  placeholder="p.ej., 3"
                  value={customParts}
                  onChange={(e) => setCustomParts(e.target.value)}
                />
              </div>
            )}

            {splitType === "pagesperpart" && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="pages-per-part">Páginas por parte</Label>
                <Input
                  id="pages-per-part"
                  type="number"
                  min="1"
                  placeholder="p.ej., 5"
                  value={pagesPerPart}
                  onChange={(e) => setPagesPerPart(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!showNameInput ? (
            <Button
              onClick={handleSplit}
              disabled={!canProcess || isProcessing}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Split className="mr-2 h-4 w-4" />
                  {splitType === "select" ? "Extraer páginas" : "Dividir PDF"}
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <p className="text-sm font-medium">
                  {splitType === "select" ? "¡Páginas extraídas correctamente!" : "¡PDF dividido correctamente!"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-name">Nombre de salida (opcional)</Label>
                <Input
                  id="output-name"
                  type="text"
                  placeholder={splitType === "select" ? "extracted.pdf" : "split-pdfs.zip"}
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                />
              </div>

              <Button onClick={handleDownload} size="lg" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {splitType === "select" ? "Descargar PDF" : "Descargar ZIP"}
              </Button>

              <Button
                onClick={() => {
                  setFiles([])
                  setProcessedBlob(null)
                  setShowNameInput(false)
                  setOutputName("")
                  setSelectedPages("")
                  setPdfFileId(null)
                  setPdfPageCount(0)
                }}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Otra división
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
