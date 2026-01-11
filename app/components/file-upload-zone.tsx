"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileItem {
  id: string
  file: File
  preview?: string
}

interface FileUploadZoneProps {
  files: FileItem[]
  onFilesChange: (files: FileItem[]) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
  showPreview?: boolean
  allowReorder?: boolean
}

export function FileUploadZone({
  files,
  onFilesChange,
  accept = ".pdf",
  multiple = true,
  maxFiles,
  showPreview = true,
  allowReorder = true,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      addFiles(droppedFiles)
    },
    [files, maxFiles, multiple],
  )

  const addFiles = (newFiles: File[]) => {
    if (!multiple && newFiles.length > 1) {
      newFiles = [newFiles[0]]
    }

    if (maxFiles && files.length + newFiles.length > maxFiles) {
      alert(`Solo puedes subir hasta ${maxFiles} archivos`)
      return
    }

    const fileItems: FileItem[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: file.type === "application/pdf" ? URL.createObjectURL(file) : undefined,
    }))

    onFilesChange([...files, ...fileItems])
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (id: string) => {
    const fileToRemove = files.find((f) => f.id === id)
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview)
    }
    onFilesChange(files.filter((f) => f.id !== id))
  }

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newFiles = [...files]
    const draggedFile = newFiles[draggedIndex]
    newFiles.splice(draggedIndex, 1)
    newFiles.splice(index, 0, draggedFile)

    onFilesChange(newFiles)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
          isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted hover:border-primary/50",
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
          <Upload
            className={cn("h-10 w-10 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")}
          />
          <div>
            <p className="text-sm font-medium">
              {isDragging ? "Suelta los archivos aquí" : "Arrastra los archivos aquí o haz clic para buscar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {accept === ".pdf" ? "Solo archivos PDF" : "Tipos de archivo compatibles"}
              {maxFiles && ` (máx. ${maxFiles} archivos)`}
            </p>
          </div>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} {files.length === 1 ? "archivo seleccionado" : "archivos seleccionados"}
            </p>
            {allowReorder && files.length > 1 && <p className="text-xs text-muted-foreground">Arrastra para reordenar</p>}
          </div>

          <div className="space-y-2">
            {files.map((fileItem, index) => (
              <div
                key={fileItem.id}
                draggable={allowReorder}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOverItem(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all",
                  allowReorder && "cursor-move hover:shadow-md",
                  draggedIndex === index && "opacity-50",
                )}
              >
                {allowReorder && <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(fileItem.file.size)}</p>
                </div>

                <Button variant="ghost" size="icon" onClick={() => removeFile(fileItem.id)} className="flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
