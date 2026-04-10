import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRequestEmailOtp, useVerifyEmailOtp, useGetWalletNonce, useVerifyWalletSignature, useCreateTicket } from "@workspace/api-client-react";
import { Shield, Mail, Wallet, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";

// Placeholder for SIWE
const signSiweMessage = async (nonce: string, address: string) => {
  return `Dummy signature for nonce ${nonce} and address ${address}`;
};

export default function IndexPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col md:flex-row">
      <div className="flex-1 p-8 md:p-16 flex flex-col justify-center max-w-2xl mx-auto w-full border-r border-border">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-mono font-bold tracking-tight">TrustDesk</h1>
          </div>
          <p className="text-muted-foreground text-lg mb-8 max-w-md">
            Verifiable support platform where every interaction is cryptographically signed and hash-chained.
          </p>
        </div>

        <AuthForms />
      </div>

      <div className="flex-1 bg-muted/30 p-8 md:p-16 flex items-center justify-center">
        <div className="max-w-md w-full">
          <TicketSubmissionForm />
        </div>
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
        toast({ title: "OTP Sent", description: "Check your email for the code." });
      },
      onError: () => toast({ title: "Error", description: "Failed to send OTP.", variant: "destructive" })
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
      onError: () => toast({ title: "Error", description: "Invalid OTP.", variant: "destructive" })
    });
  };

  const handleWalletLogin = async () => {
    try {
      const address = "0x" + Math.random().toString(16).slice(2, 42); // Dummy address for now
      const nonceRes = await getNonce.refetch();
      if (!nonceRes.data?.nonce) throw new Error("No nonce");
      
      const signature = await signSiweMessage(nonceRes.data.nonce, address);
      
      verifyWallet.mutate({ 
        data: { message: `Sign in to TrustDesk. Nonce: ${nonceRes.data.nonce}`, signature, address } 
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          window.location.reload();
        },
        onError: () => toast({ title: "Error", description: "Failed to verify wallet.", variant: "destructive" })
      });
    } catch (err) {
      toast({ title: "Error", description: "Wallet login failed.", variant: "destructive" });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Authenticate to access your tickets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Button 
            variant={method === "email" ? "default" : "outline"} 
            className="flex-1" 
            onClick={() => setMethod("email")}
          >
            <Mail className="w-4 h-4 mr-2" /> Email
          </Button>
          <Button 
            variant={method === "wallet" ? "default" : "outline"} 
            className="flex-1" 
            onClick={() => setMethod("wallet")}
          >
            <Wallet className="w-4 h-4 mr-2" /> Wallet
          </Button>
        </div>

        {method === "email" ? (
          !otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={requestOtp.isPending}>
                {requestOtp.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Code <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input 
                  id="otp" 
                  type="text" 
                  placeholder="Enter 6-digit code" 
                  value={otp} 
                  onChange={e => setOtp(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={verifyOtp.isPending}>
                {verifyOtp.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify & Sign In
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setOtpSent(false)}>
                Use a different email
              </Button>
            </form>
          )
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect your Web3 wallet to sign in. Every action will be tied to your cryptographic identity.
            </p>
            <Button onClick={handleWalletLogin} className="w-full" disabled={getNonce.isFetching || verifyWallet.isPending}>
              {(getNonce.isFetching || verifyWallet.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Connect Wallet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TicketSubmissionForm() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const createTicket = useCreateTicket();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTicket.mutate({ data: { subject, content, priority: "NORMAL" } }, {
      onSuccess: (res) => {
        toast({ title: "Ticket Submitted", description: "Your support request has been logged." });
        setSubject("");
        setContent("");
        if (user) setLocation(`/tickets/${res.id}`);
      },
      onError: () => toast({ title: "Error", description: "Failed to submit ticket.", variant: "destructive" })
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open a Ticket</CardTitle>
        <CardDescription>Need help? Submit a verifiable request.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="guest-email">Your Email</Label>
              <Input 
                id="guest-email" 
                type="email" 
                placeholder="Required for replies" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input 
              id="subject" 
              placeholder="Brief summary of issue" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Details</Label>
            <Textarea 
              id="content" 
              placeholder="Describe your issue in detail..." 
              className="min-h-[120px]"
              value={content} 
              onChange={e => setContent(e.target.value)} 
              required 
            />
          </div>
          <Button type="submit" className="w-full" disabled={createTicket.isPending}>
            {createTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Verifiable Ticket
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
