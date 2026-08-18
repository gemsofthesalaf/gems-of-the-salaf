import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t py-12 bg-muted/20">
      <div className="container mx-auto px-4 md:px-8 grid gap-8 grid-cols-2 md:grid-cols-4">
        <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
          <span className="font-serif font-bold text-lg">Gems of the Salaf</span>
          <span className="font-arabic font-bold text-xl mb-2">جواهر السلف</span>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A scholarly digital library of authentic sayings from the early generations of Islam.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="font-semibold text-sm">Library</h4>
          <Link href="/quotes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Browse Quotes</Link>
          <Link href="/scholars" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Scholars</Link>
          <Link href="/sources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sources</Link>
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="font-semibold text-sm">Collections</h4>
          <Link href="/categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Categories</Link>
          <Link href="/translators" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Translators</Link>
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="font-semibold text-sm">Connect</h4>
          <Link href="https://t.me/gemsofthesalaf" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Telegram Channel</Link>
          <Link href="/admin/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Admin Login</Link>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-8 mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Gems of the Salaf. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Designed for the preservation of knowledge.</p>
      </div>
    </footer>
  )
}
