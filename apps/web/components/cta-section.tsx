import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-r from-primary to-stellar">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
          Ready to Start Saving?
        </h2>
        <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto text-pretty">
          Join thousands of community members already building wealth together on EsuStellar.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold" asChild>
            <Link href="/create">
              Create Your Group
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 bg-transparent"
            asChild
          >
            <Link href="/groups">Explore Groups</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
