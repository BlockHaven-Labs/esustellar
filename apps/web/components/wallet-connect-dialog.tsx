"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, ExternalLink, Copy, CheckCircle2, AlertCircle, Plug } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";

interface WalletConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WalletOption {
  id: string;
  name: string;
  installed: boolean;
  url: string;
  description: string;
  comingSoon?: boolean;
}

export function WalletConnectDialog({ open, onOpenChange }: WalletConnectDialogProps) {
  const { isConnected, publicKey, connect, disconnect, hasFreighter, isConnecting } = useWallet();
  const [copied, setCopied] = useState(false);

  const wallets: WalletOption[] = [
    {
      id: "freighter",
      name: "Freighter",
      installed: hasFreighter,
      url: "https://www.freighter.app",
      description: "Browser extension for Stellar",
    },
    {
      id: "lobstr",
      name: "LOBSTR",
      installed: false,
      url: "https://lobstr.co",
      description: "Mobile & web wallet",
      comingSoon: true,
    },
    {
      id: "xbull",
      name: "xBull",
      installed: false,
      url: "https://xbull.app",
      description: "Browser extension wallet",
      comingSoon: true,
    },
  ];

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {isConnected ? "Wallet Connected" : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription>
            {isConnected
              ? "Your Stellar wallet is connected"
              : "Choose a wallet to connect to EsuStellar"}
          </DialogDescription>
        </DialogHeader>

        {isConnected && publicKey ? (
          <div className="space-y-4">
            {/* Connected Address */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Connected Address</p>
                  <p className="font-mono text-sm text-foreground">
                    {publicKey.slice(0, 8)}...{publicKey.slice(-6)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopyAddress}>
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`rounded-lg border p-4 ${
                  wallet.comingSoon ? "opacity-60" : "hover:border-primary/50 transition-colors"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{wallet.name}</p>
                      {wallet.comingSoon && (
                        <Badge variant="outline" className="text-xs">
                          Coming Soon
                        </Badge>
                      )}
                      {wallet.installed && !wallet.comingSoon && (
                        <Badge variant="default" className="text-xs">
                          Detected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{wallet.description}</p>
                  </div>

                  {wallet.comingSoon ? (
                    <Button variant="outline" size="sm" disabled>
                      Soon
                    </Button>
                  ) : wallet.id === "freighter" ? (
                    <Button
                      size="sm"
                      onClick={hasFreighter ? handleConnect : () => window.open(wallet.url, "_blank")}
                      disabled={isConnecting}
                    >
                      {hasFreighter ? (
                        <>
                          <Plug className="mr-2 h-4 w-4" />
                          Connect
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Install
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}

            {!hasFreighter && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Freighter is not installed. Click &quot;Install&quot; to download the browser extension.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
