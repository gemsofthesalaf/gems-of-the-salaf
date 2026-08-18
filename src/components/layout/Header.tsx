'use client'

import { useState } from "react"
import Link from "next/link"
import { Search, Library, Users, Menu, BookOpen, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="hidden font-serif text-xl font-bold md:inline-block">
              Gems of the Salaf
            </span>
            <span className="font-arabic text-2xl font-bold md:hidden">
              جواهر السلف
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/quotes" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Quotes
            </Link>
            <Link href="/scholars" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Scholars
            </Link>
            <Link href="/categories" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Categories
            </Link>
            <Link href="/sources" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Sources
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="hidden md:flex">
            <Link href="/quotes">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="hidden md:inline-flex border-primary text-primary hover:bg-primary/10 transition-colors">
            <Link href="https://t.me/gemsofthesalaf" target="_blank" rel="noreferrer">
              Telegram
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background border-t">
          <nav className="flex flex-col p-4 gap-4 h-full overflow-y-auto pb-20">
            <Link 
              href="/quotes" 
              className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 font-medium text-lg border hover:border-primary/50 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Search className="h-5 w-5 text-primary" />
              Search Quotes
            </Link>
            <Link 
              href="/scholars" 
              className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 font-medium text-lg border hover:border-primary/50 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Users className="h-5 w-5 text-primary" />
              Browse Scholars
            </Link>
            <Link 
              href="/categories" 
              className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 font-medium text-lg border hover:border-primary/50 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Library className="h-5 w-5 text-primary" />
              Topics & Categories
            </Link>
            
            <div className="mt-8 flex flex-col gap-4 px-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">External Links</h3>
              <Button asChild variant="outline" className="w-full justify-start border-primary text-primary hover:bg-primary/10">
                <Link href="https://t.me/gemsofthesalaf" target="_blank">
                  Join us on Telegram
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
