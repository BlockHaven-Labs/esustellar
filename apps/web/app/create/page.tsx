import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CreateGroupForm } from "@/components/create-group-form"

export default function CreateGroupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">
              Create a Savings Group
            </h1>
            <p className="mt-2 text-muted-foreground">
              Set up your group parameters and invite members to start saving together
            </p>
          </div>

          <CreateGroupForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
