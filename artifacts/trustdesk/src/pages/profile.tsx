import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, User as UserIcon, Mail, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ProfilePage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  
  const { data: user, isLoading } = useGetMe({
    query: { enabled: !!authUser, queryKey: ['me'] }
  });

  if (authLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!authUser) return <Redirect to="/" />;

  if (isLoading || !user) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8 h-full overflow-auto">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight mb-2">My Profile</h1>
          <p className="text-muted-foreground">Your cryptographic identity and reputation.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identity details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center border-2 border-border">
                <UserIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono mb-1">ID</p>
                <p className="font-mono font-medium">{user.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                  <Mail className="w-4 h-4" /> Email
                </div>
                <p className="font-mono">{user.primaryEmail || "Not connected"}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                  <Wallet className="w-4 h-4" /> Wallet
                </div>
                <p className="font-mono truncate">{user.primaryWallet || "Not connected"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reputation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Trust Score
              </span>
              <span className="font-mono">{(user.reputationScore * 100).toFixed(0)} / 100</span>
            </div>
            <Progress value={user.reputationScore * 100} className="h-3 bg-muted" />
            <p className="text-sm text-muted-foreground mt-4">
              Your reputation score increases as you maintain a history of good interactions and verified reports.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
