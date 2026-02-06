"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Loader2, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getApiConfig } from "@/lib/api-config"

interface PdfThumbnailPreviewProps {
    fileId: string
    fileName: string
    pageCount: number
    onRemove?: () => void
    compact?: boolean // true para grid de varias miniaturas, false para card grande
}

export function PdfThumbnailPreview({
    fileId,
    fileName,
    pageCount,
    onRemove,
    compact = false,
}: PdfThumbnailPreviewProps) {
    const [thumbnail, setThumbnail] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadThumbnail = async () => {
            try {
                const config = getApiConfig()
                const response = await fetch(`${config.baseUrl}/preview/${fileId}?page=0`)

                if (response.ok) {
                    const blob = await response.blob()
                    const url = URL.createObjectURL(blob)
                    setThumbnail(url)
                } else {
                    setError("No se pudo cargar la miniatura")
                }
            } catch (err) {
                console.error("Error loading thumbnail:", err)
                setError("Error al cargar la miniatura")
            } finally {
                setIsLoading(false)
            }
        }

        loadThumbnail()

        return () => {
            if (thumbnail) {
                URL.revokeObjectURL(thumbnail)
            }
        }
    }, [fileId])

    if (compact) {
        // Versión compacta para grid
        return (
            <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                    {isLoading && (
                        <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {error && (
                        <div className="w-full aspect-[3/4] bg-destructive/10 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                    )}

                    {thumbnail && (
                        <img
                            src={thumbnail}
                            alt={fileName}
                            className="w-full aspect-[3/4] object-cover"
                        />
                    )}

                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white text-xs">
                        <p className="truncate font-medium">{fileName}</p>
                        <p className="text-white/80">{pageCount} páginas</p>
                    </div>

                    {/* Remove button */}
                    {onRemove && (
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={onRemove}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </CardContent>
            </Card>
        )
    }

    // Versión grande (fullsize preview card)
    return (
        <Card className="w-full">
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <p className="font-medium truncate text-sm">{fileName}</p>
                            <p className="text-xs text-muted-foreground">{pageCount} páginas</p>
                        </div>
                        {onRemove && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 ml-2"
                                onClick={onRemove}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative bg-muted rounded-lg overflow-hidden">
                        {isLoading && (
                            <div className="w-full h-64 flex items-center justify-center bg-muted">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {error && (
                            <div className="w-full h-64 flex flex-col items-center justify-center bg-destructive/10 gap-2">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                                <p className="text-xs text-destructive">{error}</p>
                            </div>
                        )}

                        {thumbnail && (
                            <img
                                src={thumbnail}
                                alt={fileName}
                                className="w-full h-64 object-contain"
                            />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
