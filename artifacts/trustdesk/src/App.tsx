import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";

import NotFound from "@/pages/not-found";
import IndexPage from "@/pages/index";
import DashboardPage from "@/pages/dashboard";
import TicketsPage from "@/pages/tickets";
import TicketDetailPage from "@/pages/ticket-detail";
import UserProfilePage from "@/pages/user-profile";
import ProfilePage from "@/pages/profile";
import AuditLogPage from "@/pages/audit-log";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={IndexPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/tickets" component={TicketsPage} />
      <Route path="/tickets/:ticketId" component={TicketDetailPage} />
      <Route path="/users/:userId" component={UserProfilePage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/audit" component={AuditLogPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
