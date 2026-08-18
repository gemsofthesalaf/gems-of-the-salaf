import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, ArrowRight, Library, BookOpen } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden border-b bg-muted/30 py-24 px-4 text-center">
        <div className="container relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-6">
          <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            A scholarly digital library
          </div>
          <h1 className="font-arabic text-6xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight mt-4">
            جواهر السلف
          </h1>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Gems of the Salaf
          </h2>
          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed mt-4">
            An archive of beneficial sayings from the early generations of Islam, featuring Arabic originals, English translations, and complete scholarly citations.
          </p>
          
          <div className="mt-8 flex w-full max-w-lg flex-col gap-4 sm:flex-row sm:items-center">
            <Button size="lg" className="w-full gap-2 sm:w-auto" asChild>
              <Link href="/quotes">
                <Search className="h-4 w-4" />
                Search Thousands of Quotes
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto" asChild>
              <Link href="/scholars">
                <Library className="h-4 w-4" />
                Browse Scholars
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories & Stats */}
      <section className="py-20 bg-background px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 text-center md:text-left mb-12">
            <h3 className="font-serif text-3xl font-bold">Explore the Archive</h3>
            <p className="text-muted-foreground max-w-2xl">
              Browse by scholarly topics, view the major works of the Salaf, or search for specific guidance on purification of the heart, Tawhid, and knowledge.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/categories/tawhid" className="group flex flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-md">
              <span className="font-arabic text-2xl font-bold">التوحيد</span>
              <span className="font-serif font-semibold">Tawhid</span>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">Browse <ArrowRight className="h-3 w-3" /></span>
            </Link>
            <Link href="/categories/knowledge" className="group flex flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-md">
              <span className="font-arabic text-2xl font-bold">العلم</span>
              <span className="font-serif font-semibold">Knowledge</span>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">Browse <ArrowRight className="h-3 w-3" /></span>
            </Link>
            <Link href="/categories/heart" className="group flex flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-md">
              <span className="font-arabic text-2xl font-bold">تزكية النفس</span>
              <span className="font-serif font-semibold">Purification</span>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">Browse <ArrowRight className="h-3 w-3" /></span>
            </Link>
            <Link href="/scholars/ibn-taymiyyah" className="group flex flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-md">
              <span className="font-arabic text-2xl font-bold">ابن تيمية</span>
              <span className="font-serif font-semibold">Ibn Taymiyyah</span>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">Browse <ArrowRight className="h-3 w-3" /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* About CTA Section */}
      <section className="border-t bg-muted/20 py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center flex flex-col items-center gap-8">
          <BookOpen className="h-12 w-12 text-primary" />
          <h3 className="font-serif text-3xl md:text-4xl font-bold">Preserving the Heritage</h3>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Our mission is to digitally archive and categorize the rich intellectual and spiritual heritage of the early generations of Muslims, providing an accessible, authentic reference for students of knowledge worldwide.
          </p>
          <Button size="lg" asChild>
            <Link href="/about">Learn More</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
