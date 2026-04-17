import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestEmailOtp, useVerifyEmailOtp, useGetWalletNonce, useVerifyWalletSignature } from "@workspace/api-client-react";
import { Shield, Mail, Wallet, ArrowRight, Loader2, Lock, GitBranch, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const signSiweMessage = async (nonce: string, address: string) => {
  return `Demo-sig:${nonce}:${address}`;
};

export default function IndexPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/tickets" />;
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col lg:flex-row">
      <div className="flex-1 p-8 lg:p-16 flex flex-col justify-center max-w-xl mx-auto w-full lg:max-w-none lg:mx-0 lg:border-r lg:border-border">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center border border-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-mono font-bold tracking-tight">TrustDesk</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3 leading-snug">
            Support where every<br />
            <span className="text-primary">response is signed.</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-sm">
            Cryptographically verifiable helpdesk for crypto teams and DAOs. Every staff reply is signed. Every message is hash-chained. No impersonation possible.
          </p>
        </div>

        <AuthForms />
      </div>

      <div className="hidden lg:flex flex-1 p-16 flex-col justify-center bg-muted/5 border-l border-border">
        <FeatureShowcase />
      </div>
    </div>
  );
}

function AuthForms() {
  const [method, setMethod] = useState<"wallet" | "email">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const requestOtp = useRequestEmailOtp();
  const verifyOtp = useVerifyEmailOtp();
  const getNonce = useGetWalletNonce();
  const verifyWallet = useVerifyWalletSignature();

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    requestOtp.mutate({ data: { email } }, {
      onSuccess: () => {
        setOtpSent(true);
        toast({ title: "Code sent", description: `Check your email — or see the server logs in dev mode.` });
      },
      onError: () => toast({ title: "Error", description: "Failed to send code.", variant: "destructive" })
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    verifyOtp.mutate({ data: { email, otp } }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        window.location.reload();
      },
      onError: () => toast({ title: "Invalid code", description: "Check the code and try again.", variant: "destructive" })
    });
  };

  const handleWalletLogin = async () => {
    try {
      const address = `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`;
      const nonceRes = await getNonce.refetch();
      if (!nonceRes.data?.nonce) throw new Error("No nonce");
      const signature = await signSiweMessage(nonceRes.data.nonce, address);
      verifyWallet.mutate({
        data: { message: `Sign in to TrustDesk\n\nNonce: ${nonceRes.data.nonce}`, signature, address }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          window.location.reload();
        },
        onError: () => toast({ title: "Error", description: "Wallet login failed.", variant: "destructive" })
      });
    } catch {
      toast({ title: "Error", description: "Wallet login failed.", variant: "destructive" });
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Sign in</CardTitle>
        <CardDescription className="text-xs">Access your support tickets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-5">
          <Button
            variant={method === "email" ? "default" : "outline"}
            size="sm"
            className="flex-1 font-mono text-xs"
            onClick={() => { setMethod("email"); setOtpSent(false); }}
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" /> Email
          </Button>
          <Button
            variant={method === "wallet" ? "default" : "outline"}
            size="sm"
            className="flex-1 font-mono text-xs"
            onClick={() => setMethod("wallet")}
          >
            <Wallet className="w-3.5 h-3.5 mr-1.5" /> Wallet
          </Button>
        </div>

        {method === "email" ? (
          !otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="font-mono text-sm"
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="sm" disabled={requestOtp.isPending}>
                {requestOtp.isPending
                  ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  : <ArrowRight className="w-3.5 h-3.5 mr-1.5" />}
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <p className="text-xs text-muted-foreground font-mono">Sent to <span className="text-foreground">{email}</span></p>
              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-xs">6-digit code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="font-mono text-lg tracking-widest text-center"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" size="sm" disabled={verifyOtp.isPending || otp.length !== 6}>
                {verifyOtp.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Verify & sign in
              </Button>
              <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setOtpSent(false); setOtp(""); }}>
                Use a different email
              </button>
            </form>
          )
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect your Web3 wallet to sign in with SIWE (EIP-4361). Your identity is cryptographically verified.
            </p>
            <Button
              onClick={handleWalletLogin}
              className="w-full"
              size="sm"
              disabled={getNonce.isFetching || verifyWallet.isPending}
            >
              {(getNonce.isFetching || verifyWallet.isPending)
                ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                : <Wallet className="w-3.5 h-3.5 mr-1.5" />}
              Connect wallet
            </Button>
            <p className="text-[10px] text-muted-foreground/60 text-center font-mono">Demo: generates a random wallet address</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureShowcase() {
  const mockMessages = [
    {
      role: "USER",
      content: "My transaction shows pending for 48h. TX: 0x9a2b...",
      seq: 1,
      hash: "a3f9d2c1",
      time: "09:14",
    },
    {
      role: "STAFF",
      content: "Investigating now. Likely network congestion — I'll update you within the hour.",
      seq: 2,
      hash: "7e1b4f82",
      signed: true,
      time: "09:31",
    },
  ];

  return (
    <div className="max-w-md w-full space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-1">Built for accountability</h2>
        <p className="text-sm text-muted-foreground">Every interaction is cryptographically anchored — not just logged.</p>
      </div>

      <div className="space-y-3">
        {mockMessages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'STAFF' ? 'flex-row-reverse' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
              {msg.role === 'STAFF'
                ? <Shield className="w-3.5 h-3.5 text-primary" />
                : <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />}
            </div>
            <div className={`flex flex-col ${msg.role === 'STAFF' ? 'items-end' : 'items-start'} max-w-[80%]`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">{msg.time}</span>
                {msg.signed && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 border-primary/30 text-primary bg-primary/5 font-mono">
                    <Lock className="w-2 h-2" /> SIG
                  </Badge>
                )}
              </div>
              <div className={`px-3 py-2 rounded text-xs font-mono leading-relaxed ${
                msg.role === 'STAFF'
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-card border border-border'
              }`}>
                {msg.content}
              </div>
              <div className="mt-1 flex gap-2 opacity-40">
                <span className="text-[9px] font-mono text-muted-foreground">seq:{msg.seq}</span>
                <span className="text-[9px] font-mono text-muted-foreground">{msg.hash}…</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Lock, title: "Signed replies", desc: "Staff responses carry an ED25519 signature verifiable by anyone" },
          { icon: GitBranch, title: "Hash chain", desc: "Messages form a tamper-evident chain — any edit breaks the sequence" },
          { icon: Eye, title: "Auditable", desc: "Full audit trail of every staff action, status change, and decision" },
        ].map((f, i) => (
          <div key={i} className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <f.icon className="w-4 h-4 text-primary mb-2" />
            <p className="text-xs font-semibold mb-1">{f.title}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/60 font-mono">
        Demo: use staff@trustdesk.io — OTP appears in server logs
      </p>
    </div>
  );
}
