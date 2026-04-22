import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { Redirect, Link } from "wouter";
import { useListTickets } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ListTicketsStatus } from "@workspace/api-client-react";

type TicketSortMode = "TRIAGE" | "NEWEST" | "OLDEST";

export default function TicketsPage() {
  const { user, isStaff, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ListTicketsStatus | "ALL">("ALL");
  const [sortMode, setSortMode] = useState<TicketSortMode>("TRIAGE");
  const [triageOnly, setTriageOnly] = useState(false);
  const [search, setSearch] = useState("");
  
  const { data, isLoading } = useListTickets({ 
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit: 50
  });

  if (authLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/" />;

  const filteredTickets = useMemo(() => {
    return (data?.tickets ?? []).filter((ticket) => {
      const matchesSearch =
        !search ||
        ticket.subject?.toLowerCase().includes(search.toLowerCase()) ||
        ticket.id.toLowerCase().includes(search.toLowerCase());

      const matchesTriage = !triageOnly || ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";

      return matchesSearch && matchesTriage;
    });
  }, [data?.tickets, search, triageOnly]);

  const sortedTickets = useMemo(() => {
    const copy = [...filteredTickets];

    const statusOrder: Record<ListTicketsStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 1,
      RESOLVED: 2,
      CLOSED: 3,
    };

    const priorityOrder: Record<string, number> = {
      URGENT: 0,
      HIGH: 1,
      NORMAL: 2,
      LOW: 3,
    };

    copy.sort((a, b) => {
      if (sortMode === "NEWEST") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }

      if (sortMode === "OLDEST") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }

      const statusDelta = statusOrder[a.status] - statusOrder[b.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }

      const priorityDelta = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const riskDelta = b.riskScore - a.riskScore;
      if (riskDelta !== 0) {
        return riskDelta;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return copy;
  }, [filteredTickets, sortMode]);

  const openCount = data?.tickets.filter((ticket) => ticket.status === "OPEN").length ?? 0;
  const inProgressCount = data?.tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length ?? 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-mono font-bold tracking-tight">Tickets</h1>
            <p className="text-muted-foreground">{isStaff ? "All active support requests." : "Your verifiable support history."}</p>
          </div>
          {isStaff && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">OPEN: {openCount}</Badge>
              <Badge variant="outline" className="font-mono">IN_PROGRESS: {inProgressCount}</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID or subject..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 font-mono text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: ListTicketsStatus | "ALL") => setStatusFilter(v)}>
            <SelectTrigger className="w-[180px] font-mono text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ALL STATUSES</SelectItem>
              <SelectItem value="OPEN">OPEN</SelectItem>
              <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
              <SelectItem value="RESOLVED">RESOLVED</SelectItem>
              <SelectItem value="CLOSED">CLOSED</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortMode} onValueChange={(value: TicketSortMode) => setSortMode(value)}>
            <SelectTrigger className="w-[180px] font-mono text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRIAGE">TRIAGE</SelectItem>
              <SelectItem value="NEWEST">NEWEST</SelectItem>
              <SelectItem value="OLDEST">OLDEST</SelectItem>
            </SelectContent>
          </Select>
          {isStaff && (
            <Button
              variant={triageOnly ? "default" : "outline"}
              className="font-mono text-xs"
              onClick={() => setTriageOnly((value) => !value)}
            >
              {triageOnly ? "TRIAGE ONLY: ON" : "TRIAGE ONLY"}
            </Button>
          )}
        </div>

        <div className="border border-border rounded-lg bg-card flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : sortedTickets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <p>No tickets found.</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono">ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    {isStaff && <TableHead>Risk</TableHead>}
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-muted/50 cursor-pointer transition-colors group">
                      <TableCell className="font-mono text-xs">
                        <Link href={`/tickets/${ticket.id}`} className="block py-2">
                          {ticket.id.split('-')[0]}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <Link href={`/tickets/${ticket.id}`} className="block py-2">
                          {ticket.subject || "No Subject"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tickets/${ticket.id}`} className="block py-2">
                          <Badge variant={ticket.status === 'OPEN' ? 'destructive' : ticket.status === 'IN_PROGRESS' ? 'default' : 'secondary'} className="font-mono text-[10px]">
                            {ticket.status}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tickets/${ticket.id}`} className="block py-2">
                          <span className={`text-xs font-mono px-2 py-1 rounded-sm ${ticket.priority === 'URGENT' ? 'bg-destructive/20 text-destructive' : ticket.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                            {ticket.priority}
                          </span>
                        </Link>
                      </TableCell>
                      {isStaff && (
                        <TableCell>
                          <Link href={`/tickets/${ticket.id}`} className="block py-2">
                            <span className={`text-xs font-mono px-2 py-1 rounded-sm ${ticket.riskScore >= 0.7 ? 'bg-destructive/20 text-destructive' : ticket.riskScore >= 0.3 ? 'bg-amber-500/20 text-amber-600' : 'bg-emerald-500/20 text-emerald-600'}`}>
                              {(ticket.riskScore * 100).toFixed(0)}%
                            </span>
                          </Link>
                        </TableCell>
                      )}
                      <TableCell className="text-right text-muted-foreground font-mono text-xs">
                        <Link href={`/tickets/${ticket.id}`} className="block py-2">
                          {formatDistanceToNow(new Date(ticket.updatedAt))} ago
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
