import Link from "next/link"
import { ShieldAlert } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <header className="border-b bg-background px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 font-bold font-serif">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <Link href="/admin">Gems Admin</Link>
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/admin/quotes" className="hover:text-primary transition-colors">Quotes</Link>

          <Link href="/admin/scholars" className="hover:text-primary transition-colors">Taxonomy</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors ml-4 border-l pl-4">
            Exit to Site
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  )
}
