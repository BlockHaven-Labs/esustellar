import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("text-primary", className)}>
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="20" r="10" fill="currentColor" opacity="0.2" />
      <path d="M20 8L20 32M8 20L32 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="4" fill="currentColor" />
    </svg>
  )
}
