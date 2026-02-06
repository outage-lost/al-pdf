"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Evitar renderizar antes de hidratación para prevenir clicks dobles
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="transition-transform hover:scale-110"
      >
        <div className="h-5 w-5 rounded-full bg-muted animate-pulse"></div>
        <span className="sr-only">Cargando tema</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        const newTheme = theme === "dark" ? "light" : "dark"
        setTheme(newTheme)
      }}
      className="transition-all duration-200 hover:scale-110 active:scale-95"
      title={`Cambiar a modo ${theme === "dark" ? "claro" : "oscuro"}`}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 transition-all duration-300 rotate-0" />
      ) : (
        <Moon className="h-5 w-5 transition-all duration-300 rotate-0" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
