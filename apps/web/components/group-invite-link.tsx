"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, Share2, Link2 } from "lucide-react"

interface GroupInviteLinkProps {
  groupId: string
}

/**
 * Shareable invite link for prospective members. Builds the link from the
 * current origin client-side (no server-generated token — the group page
 * itself is public/joinable per the contract's own access rules), and
 * offers a native share sheet on devices that support it, falling back to
 * copy-to-clipboard everywhere else.
 */
export function GroupInviteLink({ groupId }: GroupInviteLinkProps) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/groups/${groupId}` : ""

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success("Invite link copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy the link. Copy it manually instead.")
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my EsuStellar group", url: inviteUrl })
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
      return
    }
    void handleCopy()
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Invite Members
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Share this link so others can find and join this group.
        </p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={inviteUrl}
            className="min-w-0 flex-1 font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy invite link">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <Button type="button" variant="outline" className="w-full bg-transparent" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share Invite
        </Button>
      </CardContent>
    </Card>
  )
}
