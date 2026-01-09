import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Users, TrendingUp } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-stellar py-20 md:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-white blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white mb-6">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Built on Stellar Blockchain
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl text-balance">
              Save Together,
              <br />
              <span className="text-white/90">Grow Together</span>
            </h1>

            <p className="mt-6 text-lg text-white/80 max-w-xl mx-auto lg:mx-0 text-pretty">
              EsuStellar brings traditional community savings (Esusu/Ajo) to the blockchain. Transparent, trustless, and
              accessible to everyone.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold" asChild>
                <Link href="/create">
                  Start a Savings Group
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                asChild
              >
                <Link href="/groups">Browse Groups</Link>
              </Button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <FeatureCard
              icon={Shield}
              title="Trustless Security"
              description="Smart contracts ensure your funds are safe and payouts are automatic"
            />
            <FeatureCard
              icon={Users}
              title="Community Driven"
              description="Join or create groups with friends, family, or new connections"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Low Fees"
              description="Stellar's minimal transaction costs keep more money in your pocket"
            />
            <div className="hidden xl:flex items-center justify-center rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-sm text-white/70">Active Savers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/70">{description}</p>
    </div>
  )
}
