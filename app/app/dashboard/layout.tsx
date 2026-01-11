"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Combine, Split, Minimize2, FileUp, Settings, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ConfigPanel } from "@/components/config-panel"
import { getApiConfig } from "@/lib/api-config"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Unir PDFs", href: "/dashboard/merge", icon: Combine },
  { name: "Dividir PDFs", href: "/dashboard/split", icon: Split },
  { name: "Comprimir PDFs", href: "/dashboard/compress", icon: Minimize2 },
  { name: "Convertir a PDF", href: "/dashboard/convert", icon: FileUp },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    checkConfig()
  }, [])

  const checkConfig = () => {
    const config = getApiConfig()
    setIsConfigured(config.isConfigured)
  }

  const handleConfigChange = () => {
    checkConfig()
    setIsConfigOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden border-b bg-card sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">ALPDF</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsConfigOpen(true)}
              className={!isConfigured ? "text-yellow-600 dark:text-yellow-400" : ""}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r bg-card">
        <div className="flex flex-col flex-grow">
          <div className="flex items-center justify-between px-6 py-5 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              <span className="font-bold text-2xl">ALPDF</span>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all group",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsConfigOpen(true)}
                className={cn("flex-1", !isConfigured && "text-yellow-600 dark:text-yellow-400")}
              >
                <Settings className="h-5 w-5" />
                <span className="ml-2 text-sm font-medium">Ajustes</span>
              </Button>
            </div>
            {!isConfigured && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 px-2">Configura la API para empezar a usar las herramientas</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="min-h-screen">{children}</div>
      </main>

      <ConfigPanel isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} onConfigChange={handleConfigChange} />
    </div>
  )
}
