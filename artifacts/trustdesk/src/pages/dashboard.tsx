import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { useGetDashboardSummary, useGetRecentActivity, useGetRiskOverview, useListTickets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Ticket, AlertTriangle, Clock, Activity as ActivityIcon, Lock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { fallbackCapabilities, useCapabilities } from "@/lib/capabilities";
import {
  type SlaTargetsHours,
  type TicketPriority,
  useSlaOverview,
  useUpdateSlaTargets,
} from "@/lib/sla";

export default function DashboardPage() {
  const { user, isStaff, isLoading } = useAuth();
  const { data: capabilitiesData } = useCapabilities();
  const capabilities = capabilitiesData ?? fallbackCapabilities;
  const analyticsEnabled = capabilities.features.advancedAnalytics;
  const riskEnabled = capabilities.features.riskAutomation;
  const slaEnabled = capabilities.features.slaWorkflows;
  
  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/" />;
  if (!isStaff) return <Redirect to="/tickets" />;

  return (
    <AppLayout>
      <ScrollArea className="h-full">
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-mono font-bold tracking-tight mb-2">Command Center</h1>
            <p className="text-muted-foreground">
              {analyticsEnabled
                ? "Platform overview with advanced analytics and risk metrics."
                : "Core operations overview. Switch to paid tier to unlock advanced analytics and SLA controls."}
            </p>
          </div>

          <SummaryCards />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <RiskOverviewPanel enabled={riskEnabled} />
              <RecentTicketsPanel />
            </div>
            <div className="space-y-6">
              <ActivityFeedPanel enabled={analyticsEnabled} />
              <SlaOperationsPanel enabled={slaEnabled} />
            </div>
          </div>
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

function SummaryCards() {
  const { data, isLoading } = useGetDashboardSummary();

  if (isLoading) return <div className="h-32 flex items-center justify-center border border-border rounded-lg"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return null;

  const stats = [
    { title: "Open Tickets", value: data.openTickets, icon: Ticket, color: "text-blue-500" },
    { title: "In Progress", value: data.inProgressTickets, icon: Clock, color: "text-amber-500" },
    { title: "Resolved Today", value: data.resolvedToday, icon: Ticket, color: "text-emerald-500" },
    { title: "High Risk Users", value: data.highRiskUsers, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <p className="text-3xl font-mono font-bold">{stat.value}</p>
            </div>
            <div className={`p-3 bg-muted rounded-lg ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RiskOverviewPanel({ enabled }: { enabled: boolean }) {
  const { data, isLoading } = useGetRiskOverview({
    query: {
      enabled,
      queryKey: ["dashboard", "risk-overview"],
    },
  });

  if (!enabled) {
    return (
      <TierLockedCard
        title="Risk Overview"
        description="Upgrade to the paid tier to unlock anti-abuse risk analytics and recent risk event panels."
      />
    );
  }

  if (isLoading) return <Card className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></Card>;
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Risk Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <p className="text-sm text-destructive font-medium mb-1">High Risk Users</p>
            <p className="text-2xl font-mono font-bold text-destructive">{data.highRiskCount}</p>
          </div>
          <div className="flex-1 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
            <p className="text-sm text-amber-600 font-medium mb-1">Medium Risk</p>
            <p className="text-2xl font-mono font-bold text-amber-600">{data.mediumRiskCount}</p>
          </div>
          <div className="flex-1 bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
            <p className="text-sm text-emerald-600 font-medium mb-1">Low Risk</p>
            <p className="text-2xl font-mono font-bold text-emerald-600">{data.lowRiskCount}</p>
          </div>
        </div>
        
        <h4 className="text-sm font-medium mb-3">Recent Risk Events</h4>
        <div className="space-y-3">
          {data.recentEvents.slice(0, 5).map(event => (
            <div key={event.id} className="flex justify-between items-center text-sm p-2 hover:bg-muted/50 rounded-md">
              <span className="font-mono">{event.eventType}</span>
              <span className="text-muted-foreground">{formatDistanceToNow(new Date(event.createdAt))} ago</span>
            </div>
          ))}
          {data.recentEvents.length === 0 && <p className="text-sm text-muted-foreground">No recent risk events.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentTicketsPanel() {
  const { data, isLoading } = useListTickets({ limit: 5 });

  if (isLoading) return <Card className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></Card>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Tickets</CardTitle>
        <Link href="/tickets" className="text-sm text-primary hover:underline">View all</Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.tickets.slice(0, 5).map(ticket => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium truncate pr-4">{ticket.subject || 'No Subject'}</span>
                <Badge variant={ticket.status === 'OPEN' ? 'destructive' : ticket.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                  {ticket.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground font-mono">
                <span>{ticket.id.split('-')[0]}</span>
                <span>{formatDistanceToNow(new Date(ticket.createdAt))} ago</span>
              </div>
            </Link>
          ))}
          {(!data?.tickets || data.tickets.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No recent tickets.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeedPanel({ enabled }: { enabled: boolean }) {
  const { data, isLoading } = useGetRecentActivity(
    { limit: 10 },
    {
      query: {
        enabled,
        queryKey: ["dashboard", "activity", { limit: 10 }],
      },
    },
  );

  if (!enabled) {
    return (
      <TierLockedCard
        title="Live Feed"
        description="Upgrade to the paid tier to unlock high-signal activity analytics for faster triage."
      />
    );
  }

  if (isLoading) return <Card className="h-[500px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></Card>;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ActivityIcon className="w-5 h-5" />
          Live Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {data?.items.map((item, i) => (
              <div key={item.id} className="relative pl-6">
                {i !== data.items.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-border" />
                )}
                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary/50" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formatDistanceToNow(new Date(item.timestamp))} ago
                  </p>
                </div>
              </div>
            ))}
            {(!data?.items || data.items.length === 0) && (
              <p className="text-sm text-muted-foreground text-center">No recent activity.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function SlaOperationsPanel({ enabled }: { enabled: boolean }) {
  const { toast } = useToast();
  const { data, isLoading } = useSlaOverview(enabled);
  const updateSlaTargets = useUpdateSlaTargets();
  const [draftTargets, setDraftTargets] = useState<SlaTargetsHours | null>(null);

  useEffect(() => {
    if (data) {
      setDraftTargets(data.targetsHours);
    }
  }, [data]);

  if (!enabled) {
    return (
      <TierLockedCard
        title="SLA Workflows"
        description="Upgrade to the paid tier to unlock SLA risk tracking and target controls."
      />
    );
  }

  if (isLoading) {
    return <Card className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></Card>;
  }

  if (!data || !draftTargets) {
    return null;
  }

  const priorities: TicketPriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

  const handleTargetInput = (priority: TicketPriority, rawValue: string) => {
    if (rawValue.trim() === "") {
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    setDraftTargets((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [priority]: parsed,
      };
    });
  };

  const saveTargets = () => {
    updateSlaTargets.mutate(draftTargets, {
      onSuccess: () => {
        toast({ title: "SLA targets updated" });
      },
      onError: (error) => {
        toast({
          title: "Failed to update SLA targets",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          SLA Workflows
          <Badge variant="outline" className="font-mono text-[10px]">PAID</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="rounded-md border border-border p-2">ACTIVE: {data.totals.activeTickets}</div>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">BREACHED: {data.totals.breachedTickets}</div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">AT_RISK: {data.totals.atRiskTickets}</div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">ON_TRACK: {data.totals.onTrackTickets}</div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Target Hours</p>
          {priorities.map((priority) => (
            <div key={priority} className="flex items-center gap-2">
              <span className="w-16 text-xs font-mono text-muted-foreground">{priority}</span>
              <Input
                type="number"
                min={1}
                max={168}
                step={1}
                value={draftTargets[priority]}
                onChange={(event) => handleTargetInput(priority, event.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
          ))}
          <Button onClick={saveTargets} disabled={updateSlaTargets.isPending} className="w-full font-mono text-xs">
            {updateSlaTargets.isPending ? "SAVING..." : "SAVE SLA TARGETS"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Top SLA Risks</p>
          {data.sample.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active tickets in SLA queue.</p>
          ) : (
            data.sample.slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="rounded-md border border-border p-2 text-xs font-mono">
                <div className="flex items-center justify-between gap-2">
                  <span>{ticket.id.split("-")[0]}</span>
                  <Badge variant={ticket.state === "BREACHED" ? "destructive" : ticket.state === "AT_RISK" ? "outline" : "secondary"}>
                    {ticket.state}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {ticket.priority} · {ticket.remainingMinutes < 0 ? "OVERDUE" : "REMAINING"}: {formatMinutes(Math.abs(ticket.remainingMinutes))}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function TierLockedCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="w-5 h-5 text-muted-foreground" />
          {title}
          <Badge variant="outline" className="font-mono text-[10px]">PAID</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
