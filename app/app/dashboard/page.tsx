import Link from "next/link"
import { Combine, Split, Minimize2, FileUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const tools = [
  {
    name: "Unir PDFs",
    description: "Combina varios archivos PDF en un solo documento",
    icon: Combine,
    href: "/dashboard/merge",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    name: "Dividir PDFs",
    description: "Divide un PDF en varios archivos o páginas",
    icon: Split,
    href: "/dashboard/split",
    color: "text-green-600 dark:text-green-400",
  },
  {
    name: "Comprimir PDFs",
    description: "Reduce el tamaño del PDF manteniendo la calidad",
    icon: Minimize2,
    href: "/dashboard/compress",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    name: "Convertir a PDF",
    description: "Convierte imágenes y documentos a formato PDF",
    icon: FileUp,
    href: "/dashboard/convert",
    color: "text-orange-600 dark:text-orange-400",
  },
]

export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">Panel de herramientas PDF</h1>
        <p className="text-muted-foreground text-lg">Elige una herramienta para empezar a procesar tus PDF</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => (
          <Link key={tool.name} href={tool.href}>
            <Card className="transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-muted ${tool.color}`}>
                    <tool.icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{tool.name}</h3>
                  </div>
                </div>
                <p className="text-muted-foreground">{tool.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
