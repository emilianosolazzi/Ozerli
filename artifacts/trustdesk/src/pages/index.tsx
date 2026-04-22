import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestEmailOtp, useVerifyEmailOtp, useGetWalletNonce, useVerifyWalletSignature } from "@workspace/api-client-react";
import { Mail, Wallet, ArrowRight, Loader2, Lock, GitBranch, CheckCircle2, Fingerprint, Link2, Users, Gauge, Sparkles, ShieldAlert, FileText, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { APP_NAME, demoStaffEmail } from "@/lib/brand";

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
    <div className="relative min-h-[100dvh] bg-background overflow-hidden">
      <div className="pointer-events-none absolute inset-0 ozerli-hero-glow" aria-hidden />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* LEFT — 40% — identity + hero copy + sign-in */}
        <div className="flex flex-col justify-between p-8 lg:p-14 lg:border-r lg:border-border/60">
          <BrandMark />

          <div className="mt-10 space-y-10 ozerli-fade-up">
            <HeroCopy />
            <AuthForms />
          </div>

          <TrustFootnote />
        </div>

        {/* RIGHT — 60% — live trust timeline */}
        <div className="hidden lg:flex relative p-14 items-center justify-center bg-[hsl(var(--muted))]/10 border-l border-border/60">
          <div className="pointer-events-none absolute inset-0 ozerli-hero-glow opacity-60" aria-hidden />
          <VerificationTimeline />
        </div>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-44 h-44 rounded-3xl bg-white border border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.2),0_24px_70px_-18px_hsl(var(--primary)/0.7)] flex items-center justify-center overflow-hidden">
        <img
          src="/ozerli-mark.png"
          alt="Ozerli"
          className="w-full h-full object-contain p-2"
          draggable={false}
        />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-5xl font-mono font-bold tracking-tight text-foreground">{APP_NAME}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/70 mt-3">Verifiable support layer</span>
      </div>
    </div>
  );
}

function HeroCopy() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary font-mono text-xs font-semibold tracking-widest uppercase">
        <Fingerprint className="w-3.5 h-3.5" /> Signed · Chained · Audited
      </div>
      <h1 className="text-[2.25rem] leading-[1.05] font-bold tracking-tight">
        Support you can <span className="text-primary">verify.</span>
        <br />
        Every reply <span className="underline decoration-primary/60 decoration-2 underline-offset-4">signed.</span>
        <br />
        Every action <span className="text-accent">auditable.</span>
      </h1>
      <p className="mt-4 text-[0.95rem] text-foreground/75 leading-relaxed max-w-md">
        Reduce duplicate tickets, shorten response times, and give customers support they can trust — backed by provable accountability, not promises.
      </p>
    </div>
  );
}

function TrustFootnote() {
  return (
      <div className="mt-10 flex items-center gap-4 text-xs font-mono font-semibold text-foreground/75 uppercase tracking-[0.18em]">
        <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-primary" /> ED25519</span>
        <span className="w-px h-3.5 bg-border" />
        <span className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-accent" /> Hash chain</span>
        <span className="w-px h-3.5 bg-border" />
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> SOC2-oriented</span>
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
        data: { message: `Sign in to ${APP_NAME}\n\nNonce: ${nonceRes.data.nonce}`, signature, address }
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
    <Card className="w-full max-w-sm relative overflow-hidden border-border/60 bg-card/70 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" aria-hidden />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight">Access your support case</CardTitle>
          <Badge variant="outline" className="h-6 px-2 gap-1 text-[11px] font-mono font-semibold border-primary/30 text-primary bg-primary/5">
            <Fingerprint className="w-3 h-3" /> SIGNED SESSION
          </Badge>
        </div>
        <CardDescription className="text-xs text-foreground/70">Secure access with verified identity.</CardDescription>
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
                Send verified code
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
                Verify & open case
              </Button>
              <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setOtpSent(false); setOtp(""); }}>
                Use a different email
              </button>
            </form>
          )
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect a Web3 wallet to open a signed session via SIWE (EIP-4361). Your identity is cryptographically verified.
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
            <p className="text-[11px] text-foreground/55 text-center font-mono">Demo: generates a random wallet address</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VerificationTimeline() {
  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 ozerli-fade-up">
        <div className="text-xs font-mono font-semibold uppercase tracking-[0.22em] text-primary mb-3">Live ticket</div>
        <h2 className="text-2xl font-bold tracking-tight">Every reply is signed. The chain proves it.</h2>
        <p className="text-sm text-foreground/75 mt-2">
          A real Ozerli ticket — two messages, one tamper-evident chain.
        </p>
      </div>

      {/* Conversation card */}
      <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur overflow-hidden shadow-[0_10px_40px_-20px_hsl(var(--primary)/0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary ozerli-sig-pulse" />
            <span className="text-xs font-mono font-semibold text-foreground/80">Ticket #4821 · Withdrawal pending</span>
          </div>
          <span className="text-xs font-mono text-foreground/55">Today</span>
        </div>

        {/* Customer message */}
        <div className="px-4 py-4 ozerli-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-sm font-semibold text-foreground">Customer</span>
                <span className="text-xs font-mono text-foreground/55">09:14</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                My withdrawal has been pending 48h. TX: 0x9a2b…
              </p>
            </div>
          </div>
        </div>

        {/* Chain link */}
        <div className="relative h-8 ozerli-fade-up" style={{ animationDelay: "220ms" }}>
          <div className="absolute left-[31px] inset-y-0 w-px ozerli-chainline" />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-mono text-foreground/60">
              linked via <span className="text-accent">a3f9…d2c1</span>
            </span>
          </div>
        </div>

        {/* Staff signed message */}
        <div className="px-4 py-4 bg-primary/[0.04] border-y border-primary/15 ozerli-fade-up" style={{ animationDelay: "320ms" }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center flex-shrink-0 ozerli-sig-pulse">
              <Fingerprint className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
                <span className="text-sm font-semibold text-foreground">Support (staff)</span>
                <Badge variant="outline" className="h-5 px-1.5 gap-1 text-[10px] font-mono font-semibold border-primary/40 text-primary bg-primary/10">
                  <Lock className="w-2.5 h-2.5" /> SIGNED
                </Badge>
                <span className="text-xs font-mono text-foreground/55">09:31</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Investigating mempool congestion. Estimated update in 34 min.
              </p>
              <div className="mt-2 text-xs font-mono text-foreground/55">
                sig: <span className="text-primary/90">7c91…ed25519</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verified footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary/[0.06] ozerli-fade-up" style={{ animationDelay: "440ms" }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Chain verified</span>
          </div>
          <span className="text-xs font-mono text-foreground/65">signature valid · 2 messages linked</span>
        </div>
      </div>

      {/* Capability grid */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-foreground/70">Included</span>
          <span className="flex-1 h-px bg-border/60" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CapabilityCard icon={<Lock className="w-4 h-4" />} accent="primary" title="Signed replies" desc="Every staff reply carries an ED25519 signature. Verifiable by anyone." />
          <CapabilityCard icon={<GitBranch className="w-4 h-4" />} accent="accent" title="Tamper-evident chain" desc="Messages form a SHA-256 hash chain. Any edit breaks it visibly." />
          <CapabilityCard icon={<FileText className="w-4 h-4" />} accent="primary" title="Immutable staff audit" desc="Status changes, bans, replies \u2014 all logged, never rewritable." />
          <CapabilityCard icon={<Users className="w-4 h-4" />} accent="accent" title="Email + wallet identity" desc="Email OTP and SIWE wallet login, linkable to one account." />
        </div>

        <div className="flex items-center gap-2 mt-6 mb-3">
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-accent">Paid add-ons</span>
          <span className="flex-1 h-px bg-border/60" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CapabilityCard icon={<Timer className="w-4 h-4" />} accent="accent" title="SLA workflows" desc="Per-priority targets with live BREACHED / AT_RISK / ON_TRACK tracking." />
          <CapabilityCard icon={<Sparkles className="w-4 h-4" />} accent="accent" title="AI triage & routing" desc="Suggested replies, duplicate detection, smart routing, priority scoring." />
          <CapabilityCard icon={<ShieldAlert className="w-4 h-4" />} accent="accent" title="Risk & anti-abuse" desc="Per-user and per-ticket risk scores with an immutable event log." />
          <CapabilityCard icon={<Gauge className="w-4 h-4" />} accent="accent" title="Analytics & compliance" desc="Response-time stats, agent performance, SOC2-style audit export." />
        </div>
      </div>

      <p className="mt-8 text-xs text-foreground/60 font-mono">
        Demo: use {demoStaffEmail} — OTP appears in server logs.
      </p>
    </div>
  );
}

function CapabilityCard({
  icon,
  title,
  desc,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: "primary" | "accent";
}) {
  const iconColor = accent === "primary" ? "text-primary" : "text-accent";
  const ringColor = accent === "primary" ? "border-primary/25" : "border-accent/25";
  const iconBg = accent === "primary" ? "bg-primary/10" : "bg-accent/10";
  return (
    <div className={`group relative p-3.5 rounded-xl border ${ringColor} bg-card/60 backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${iconBg} ${iconColor}`}>{icon}</div>
      <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
      <p className="text-xs text-foreground/70 leading-relaxed mt-1.5">{desc}</p>
    </div>
  );
}

