import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { useRoute, Redirect } from "wouter";
import { useGetTicket, useSendMessage, useUpdateTicket, useVerifyTicketIntegrity } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Shield, ShieldAlert, ShieldCheck, Loader2, Send, User as UserIcon, Lock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { UpdateTicketBodyStatus } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function TicketDetailPage() {
  const [, params] = useRoute("/tickets/:ticketId");
  const ticketId = params?.ticketId;
  const { user, isStaff } = useAuth();
  
  if (!user) return <Redirect to="/" />;
  if (!ticketId) return <Redirect to="/tickets" />;

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-muted/10">
          <TicketThread ticketId={ticketId} />
        </div>
        {isStaff && (
          <div className="w-80 flex-shrink-0 bg-sidebar overflow-y-auto hidden lg:block border-l border-border">
            <TicketSidebar ticketId={ticketId} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function TicketThread({ ticketId }: { ticketId: string }) {
  const { data: ticket, isLoading } = useGetTicket(ticketId, {
    query: { enabled: !!ticketId, queryKey: ['ticket', ticketId] }
  });
  
  const [content, setContent] = useState("");
  const sendMessage = useSendMessage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.messages]);

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage.mutate({ data: { content } }, {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      },
      onError: () => toast({ title: "Error", description: "Failed to send message", variant: "destructive" })
    });
  };

  if (isLoading) return <div className="h-full flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!ticket) return <div className="p-8">Ticket not found.</div>;

  return (
    <>
      <div className="p-4 md:p-6 border-b border-border bg-background flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-sm text-muted-foreground">#{ticket.id.split('-')[0]}</span>
            <Badge variant={ticket.status === 'OPEN' ? 'destructive' : ticket.status === 'IN_PROGRESS' ? 'default' : 'secondary'} className="font-mono text-[10px]">
              {ticket.status}
            </Badge>
          </div>
          <h2 className="text-xl font-bold">{ticket.subject || "No Subject"}</h2>
        </div>
        <IntegrityCheck ticketId={ticket.id} />
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
        <div className="space-y-6 max-w-3xl mx-auto">
          {ticket.messages?.map((msg, i) => (
            <MessageBubble key={msg.id} message={msg} isLast={i === ticket.messages.length - 1} />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t border-border">
        <div className="max-w-3xl mx-auto flex gap-2">
          <div className="flex-1 relative">
            <Textarea 
              placeholder="Type your verifiable response..." 
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[80px] resize-none font-mono text-sm pr-12"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Lock className="w-3 h-3" />
              Signed
            </div>
          </div>
          <Button onClick={handleSend} disabled={sendMessage.isPending || !content.trim()} className="self-end">
            {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message, isLast }: { message: any, isLast: boolean }) {
  const isStaff = message.role === 'STAFF';
  const isSystem = message.role === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-dashed">
          {message.content} • {format(new Date(message.createdAt), 'HH:mm')}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex gap-4 ${isStaff ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border">
        {isStaff ? <Shield className="w-4 h-4 text-primary" /> : <UserIcon className="w-4 h-4" />}
      </div>
      <div className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">{isStaff ? 'Staff' : 'User'}</span>
          <span className="text-xs font-mono text-muted-foreground">{format(new Date(message.createdAt), 'MMM d, HH:mm')}</span>
          {message.signature && (
            <Badge variant="outline" className="text-[9px] font-mono h-4 px-1 gap-1 border-primary/30 text-primary bg-primary/5">
              <Lock className="w-2 h-2" />
              SIG
            </Badge>
          )}
        </div>
        <div className={`p-4 rounded-lg text-sm whitespace-pre-wrap font-mono leading-relaxed ${
          isStaff ? 'bg-primary/10 border border-primary/20 text-foreground' : 'bg-card border border-border text-card-foreground'
        }`}>
          {message.content}
        </div>
        <div className="mt-1 flex gap-2">
          <span className="text-[10px] font-mono text-muted-foreground opacity-50">
            Seq: {message.sequenceNumber}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground opacity-50" title={message.messageHash}>
            Hash: {message.messageHash.substring(0, 8)}...
          </span>
        </div>
      </div>
    </div>
  );
}

function IntegrityCheck({ ticketId }: { ticketId: string }) {
  const verify = useVerifyTicketIntegrity();
  
  const handleVerify = () => {
    verify.mutate({ ticketId });
  };

  if (verify.data) {
    if (verify.data.valid) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1.5 py-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Chain Verified ({verify.data.messageCount} msgs)
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1.5 py-1">
        <ShieldAlert className="w-3.5 h-3.5" />
        Chain Broken (seq {verify.data.brokenAt})
      </Badge>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleVerify} disabled={verify.isPending} className="font-mono text-xs">
      {verify.isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Lock className="w-3 h-3 mr-2" />}
      Verify Chain
    </Button>
  );
}

function TicketSidebar({ ticketId }: { ticketId: string }) {
  const { data: ticket } = useGetTicket(ticketId, {
    query: { enabled: !!ticketId, queryKey: ['ticket', ticketId] }
  });
  const updateTicket = useUpdateTicket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!ticket) return null;

  const handleStatusChange = (status: UpdateTicketBodyStatus) => {
    updateTicket.mutate({ data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
        toast({ title: "Status updated" });
      }
    });
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h3 className="text-sm font-medium text-sidebar-foreground mb-4 uppercase tracking-wider">Controls</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-sidebar-foreground/70 font-mono">Status</label>
            <Select value={ticket.status} onValueChange={handleStatusChange} disabled={updateTicket.isPending}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
                <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                <SelectItem value="CLOSED">CLOSED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-sidebar-foreground mb-4 uppercase tracking-wider">User Identity</h3>
        {ticket.creator ? (
          <div className="space-y-4">
            <Link href={`/users/${ticket.creator.id}`} className="block p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{ticket.creator.primaryEmail || "No email"}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{ticket.creator.primaryWallet || "No wallet"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted rounded p-2">
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Reputation</p>
                  <p className="text-sm font-mono font-bold text-emerald-500">{(ticket.creator.reputationScore * 100).toFixed(0)}</p>
                </div>
                <div className="bg-muted rounded p-2">
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Risk</p>
                  <p className={`text-sm font-mono font-bold ${ticket.creator.riskScore >= 0.7 ? 'text-destructive' : ticket.creator.riskScore >= 0.3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {(ticket.creator.riskScore * 100).toFixed(0)}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-sidebar-foreground/70">Unknown user</p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-sidebar-foreground mb-4 uppercase tracking-wider">Metadata</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-sidebar-foreground/70">Created</span>
            <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sidebar-foreground/70">Ticket Risk</span>
            <span className={ticket.riskScore >= 0.7 ? 'text-destructive' : ''}>{(ticket.riskScore * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sidebar-foreground/70">Priority</span>
            <span>{ticket.priority}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
