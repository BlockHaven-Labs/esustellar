'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CreateGroupForm } from "@/components/create-group-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WalletButton } from "@/components/wallet-button"
import { Wallet } from "lucide-react"
// import { useWallet } from "@/context/wallet-context"
import { useWallet } from "@/context/wallet-context"

export default function CreateGroupPage() {
  const router = useRouter()
  const { isConnected, address } = useWallet()

  // Redirect if wallet disconnects mid-session
  useEffect(() => {
    if (!isConnected) {
      router.replace("/create")
    }
  }, [isConnected, router])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">Create a Savings Group</h1>
            <p className="mt-2 text-muted-foreground">
              Set up your group parameters and invite members to start saving together
            </p>
          </div>

          {/* 🔐 Wallet Gate */}
          {!isConnected ? (
            <Card className="border-border bg-card">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Connect Your Wallet</CardTitle>
                <CardDescription>
                  You need a Stellar wallet to create a savings group
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <WalletButton />
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground text-center">
                Connected wallet: {address?.slice(0, 6)}…{address?.slice(-4)}
              </p>
              <CreateGroupForm />
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
