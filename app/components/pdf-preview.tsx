"use client"

import { useState, useEffect } from "react"
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PdfPreviewProps {
  fileUrl?: string
  fileName?: string
  thumbnailBase64?: string
  pageCount?: number
  fileId?: string
}

export function PdfPreview({
  fileUrl,
  fileName,
  thumbnailBase64,
  pageCount = 1,
  fileId,
}: PdfPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(!!fileId)
  const [error, setError] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<string[]>([])

  // Si se proporciona thumbnail base64, usarlo directamente
  useEffect(() => {
    if (thumbnailBase64) {
      setThumbnails([thumbnailBase64])
      setIsLoading(false)
    }
  }, [thumbnailBase64])

  // Si se proporciona fileId, cargar miniaturas desde el servidor
  useEffect(() => {
    if (fileId && pageCount > 0) {
      const loadThumbnails = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
          const loadedThumbnails: string[] = []

          for (let page = 0; page < Math.min(pageCount, 5); page++) {
            try {
              const response = await fetch(`${apiUrl}/preview/${fileId}?page=${page}`)
              if (response.ok) {
                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                loadedThumbnails.push(url)
              }
            } catch (err) {
              console.error(`Error loading page ${page}:`, err)
            }
          }

          if (loadedThumbnails.length > 0) {
            setThumbnails(loadedThumbnails)
          } else {
            setError("No se pudieron cargar las miniaturas")
          }
        } catch (err) {
          console.error("Error loading thumbnails:", err)
          setError("Error al cargar las miniaturas del PDF")
        } finally {
          setIsLoading(false)
        }
      }

      loadThumbnails()
    }
  }, [fileId, pageCount])

  const nextPage = () => {
    if (currentPage < thumbnails.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="p-3 border-b bg-muted flex justify-between items-center">
        <p className="text-sm font-medium truncate">
          {fileName ? fileName : `PDF Preview - Página ${currentPage + 1}/${thumbnails.length}`}
        </p>
        {pageCount && pageCount > 1 && (
          <span className="text-xs text-muted-foreground">
            {pageCount} páginas
          </span>
        )}
      </div>

      <div className="relative bg-muted/20 min-h-96 flex items-center justify-center">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground mt-2">Cargando previsualizaciones...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-96 text-center p-4">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!isLoading && !error && thumbnails.length > 0 && (
          <>
            <img
              src={thumbnails[currentPage]}
              alt={`Page ${currentPage + 1}`}
              className="max-h-96 w-auto object-contain"
            />

            {/* Navegación entre páginas */}
            {thumbnails.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-lg p-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-white px-2 py-1 flex items-center">
                  {currentPage + 1}/{thumbnails.length}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={nextPage}
                  disabled={currentPage === thumbnails.length - 1}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {!isLoading && !error && thumbnails.length === 0 && fileUrl && (
          <iframe
            src={fileUrl}
            className="w-full h-96"
            title={fileName || "PDF Preview"}
          />
        )}
      </div>
    </div>
  )
}
