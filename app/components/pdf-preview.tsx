"use client"

import { useState } from "react"

interface PdfPreviewProps {
  fileUrl: string
  fileName: string
}

export function PdfPreview({ fileUrl, fileName }: PdfPreviewProps) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="p-3 border-b bg-muted">
        <p className="text-sm font-medium truncate">{fileName}</p>
      </div>
      <div className="relative bg-muted/20">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        <iframe src={fileUrl} className="w-full h-96" title={fileName} onLoad={() => setIsLoading(false)} />
      </div>
    </div>
  )
}
