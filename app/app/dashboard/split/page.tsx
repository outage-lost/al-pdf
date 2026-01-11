"use client"

import { useState } from "react"
import { Split, Download, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
import { PdfPreview } from "@/components/pdf-preview"
import { getApiConfig } from "@/lib/api-config"
import { ApiError } from "@/lib/api-client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface FileItem {
  id: string
  file: File
  preview?: string
}

type SplitType = "pages" | "parts" | "pagesperpart"

export default function SplitPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [splitType, setSplitType] = useState<SplitType>("pages")
  const [customParts, setCustomParts] = useState("")
  const [pagesPerPart, setPagesPerPart] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputName, setOutputName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)

  const canProcess = files.length === 1

  const handleSplit = async () => {
    const config = getApiConfig()

    if (!config.isConfigured) {
      setError("API no configurada. Por favor configúrala en Ajustes.")
      return
    }

    if (!canProcess) {
      setError("Por favor sube exactamente 1 archivo PDF para dividir.")
      return
    }

    // Validate inputs based on split type
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

      // Map UI split types to API documented tokens (and provide an alternate token for compatibility)
      const mapSplitType = (t: SplitType) => {
        if (t === "pages") return { doc: "individual_pages", alt: "single-pages" }
        if (t === "parts") return { doc: "customparts", alt: "equal-parts" }
        if (t === "pagesperpart") return { doc: "pagesperpart", alt: "custom-pages" }
        return { doc: t, alt: t }
      }

      const tokenObj = mapSplitType(splitType)
      // send documented token and an alternate token for backward compatibility
      formData.append("splittype", tokenObj.doc)
      formData.append("method", tokenObj.alt)

      if (splitType === "parts") {
        formData.append("customparts", customParts)
      } else if (splitType === "pagesperpart") {
        formData.append("pagesperpart", pagesPerPart)
      }

      const response = await fetch(`${config.baseUrl}/split`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let detail = "Error al dividir el PDF"
        try {
          const ct = response.headers.get("content-type") || ""
          if (ct.includes("application/json")) {
            const errorData = await response.json()
            detail = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData)
          } else {
            const txt = await response.text()
            detail = txt || detail
          }
        } catch (e) {
          // Use default
        }
        if (!detail) {
          detail = `${response.status} ${response.statusText}`
        }
        console.error(`[Split] server responded ${response.status} ${response.statusText}:`, detail)
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
      console.error("[v0] Split error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!processedBlob) return

    const filename = outputName.trim() || "split-pdfs.zip"
    const finalFilename = filename.endsWith(".zip") ? filename : `${filename}.zip`

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
      setCustomParts("")
      setPagesPerPart("")
    }, 5000)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Split className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Dividir PDF</h1>
            <p className="text-muted-foreground">Divide un PDF en varios archivos</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subir archivo PDF</CardTitle>
          <CardDescription>Sube un archivo PDF para dividirlo en varias partes</CardDescription>
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

          <div className="space-y-4">
            <Label>Método de división</Label>
            <RadioGroup value={splitType} onValueChange={(value) => setSplitType(value as SplitType)}>
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
            <Button onClick={handleSplit} disabled={!canProcess || isProcessing} size="lg" className="w-full">
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Split className="mr-2 h-4 w-4" />
                  Dividir PDF
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <p className="text-sm font-medium">¡PDF dividido correctamente!</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-name">Nombre de salida (opcional)</Label>
                <Input
                  id="output-name"
                  type="text"
                  placeholder="split-pdfs.zip"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                />
              </div>

              <Button onClick={handleDownload} size="lg" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Descargar ZIP
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
