import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { useListStaffActions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Activity } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function AuditLogPage() {
  const { user, isStaff, isLoading: authLoading } = useAuth();
  
  const { data, isLoading } = useListStaffActions({ limit: 100 });

  if (authLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user || !isStaff) return <Redirect to="/" />;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-2">Immutable record of all staff actions.</p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Staff Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : data?.actions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">No audit logs found.</div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="font-mono">Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {format(new Date(action.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {action.actionType}
                      </TableCell>
                      <TableCell>
                        {action.staff ? (
                          <Link href={`/users/${action.staff.id}`} className="text-primary hover:underline">
                            {action.staff.primaryEmail || action.staff.id.split('-')[0]}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {action.ticketId ? (
                          <Link href={`/tickets/${action.ticketId}`} className="text-primary hover:underline">
                            Ticket: {action.ticketId.split('-')[0]}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
