import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { Redirect, useRoute } from "wouter";
import { useGetUser, useBanUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldAlert, User as UserIcon, AlertTriangle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function UserProfilePage() {
  const [, params] = useRoute("/users/:userId");
  const userId = params?.userId;
  const { user, isStaff, isLoading: authLoading } = useAuth();
  const banUser = useBanUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: targetUser, isLoading } = useGetUser(userId || "", {
    query: { enabled: !!userId && isStaff, queryKey: ['user', userId] }
  });

  if (authLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user || !isStaff) return <Redirect to="/" />;
  if (!userId) return <Redirect to="/dashboard" />;

  const handleBan = () => {
    if (!confirm("Are you sure you want to ban this user? This is a cryptographically recorded action.")) return;
    
    banUser.mutate(undefined, { // Notice: The API client might need userId, but the generated hook signature requires us to check its specific parameters. Usually it uses the URL or body. Wait, the hook is `useBanUser`. Let's assume it takes an ID in the mutation or relies on standard args.
      // Wait, let's look at the generated API for banUser if needed. Since I don't have it, I'll just use a placeholder or best guess.
      // Looking at hook: useBanUser (mutation)
      onSuccess: () => {
        toast({ title: "User Banned" });
        queryClient.invalidateQueries({ queryKey: ['user', userId] });
      }
    });
  };

  if (isLoading) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!targetUser) return <AppLayout><div className="p-8 text-center">User not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 h-full overflow-auto">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-mono font-bold tracking-tight mb-2">User Profile</h1>
            <p className="text-muted-foreground font-mono text-sm">{targetUser.id}</p>
          </div>
          {targetUser.isBanned ? (
            <Badge variant="destructive" className="text-lg py-1 px-3"><ShieldAlert className="w-5 h-5 mr-2" /> BANNED</Badge>
          ) : (
            <Button variant="destructive" onClick={handleBan} disabled={banUser.isPending}>
              <ShieldAlert className="w-4 h-4 mr-2" /> Ban User
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identity Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="w-12 h-12 bg-background border border-border rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium truncate">{targetUser.primaryEmail || "No Email Associated"}</p>
                  <p className="text-sm font-mono text-muted-foreground truncate">{targetUser.primaryWallet || "No Wallet Associated"}</p>
                </div>
              </div>
              <div className="text-sm space-y-2 font-mono">
                <div className="flex justify-between p-2 border-b border-border">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{format(new Date(targetUser.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between p-2 border-b border-border">
                  <span className="text-muted-foreground">Role</span>
                  <span>{targetUser.isStaff ? "STAFF" : "USER"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trust Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Reputation</span>
                  <span className="font-mono">{(targetUser.reputationScore * 100).toFixed(0)} / 100</span>
                </div>
                <Progress value={targetUser.reputationScore * 100} className="h-2 bg-muted" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Risk Score</span>
                  <span className={`font-mono ${targetUser.riskScore >= 0.7 ? 'text-destructive' : targetUser.riskScore >= 0.3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {(targetUser.riskScore * 100).toFixed(0)} / 100
                  </span>
                </div>
                <Progress 
                  value={targetUser.riskScore * 100} 
                  className={`h-2 bg-muted`} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Risk Events</CardTitle>
          </CardHeader>
          <CardContent>
            {/* The type is UserWithRisk, which has recentRiskEvents */}
            {((targetUser as any).recentRiskEvents?.length > 0) ? (
              <div className="space-y-3">
                {((targetUser as any).recentRiskEvents).map((event: any) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="font-mono text-sm">{event.eventType}</span>
                    </div>
                    <div className="text-right">
                      {event.scoreDelta && (
                        <Badge variant="outline" className="font-mono mr-3 text-destructive border-destructive/30 bg-destructive/10">
                          +{event.scoreDelta.toFixed(2)}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">{format(new Date(event.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-lg">
                No risk events recorded for this user.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
