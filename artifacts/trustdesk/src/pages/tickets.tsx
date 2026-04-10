import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { Redirect, Link } from "wouter";
import { useListTickets } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ListTicketsStatus } from "@workspace/api-client-react";

export default function TicketsPage() {
  const { user, isStaff, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ListTicketsStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  
  const { data, isLoading } = useListTickets({ 
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit: 50
  });

  if (authLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/" />;

  const filteredTickets = data?.tickets.filter(t => 
    !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-mono font-bold tracking-tight">Tickets</h1>
            <p className="text-muted-foreground">{isStaff ? "All active support requests." : "Your verifiable support history."}</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
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
        </div>

        <div className="border border-border rounded-lg bg-card flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : filteredTickets.length === 0 ? (
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
                  {filteredTickets.map((ticket) => (
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
