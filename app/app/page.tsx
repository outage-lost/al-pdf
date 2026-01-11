import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center">
              <FileText className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-balance">ALPDF</h1>
          <p className="text-xl md:text-2xl text-muted-foreground text-balance">Herramientas profesionales para procesar PDF</p>
        </div>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto text-pretty">
          Une, divide, comprime y convierte tus archivos PDF con facilidad. Herramientas simples, rápidas y profesionales para
          todas tus necesidades de PDF.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/dashboard">Comenzar</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
          {[
            { label: "Unir PDFs", desc: "Combina varios archivos" },
            { label: "Dividir PDFs", desc: "Divide en partes" },
            { label: "Comprimir PDFs", desc: "Reduce el tamaño del archivo" },
            { label: "Convertir a PDF", desc: "Desde varios formatos" },
          ].map((feature) => (
            <div key={feature.label} className="p-4 rounded-lg border bg-card text-left">
              <h3 className="font-semibold mb-1">{feature.label}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
