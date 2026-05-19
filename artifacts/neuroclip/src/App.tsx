import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import NotFound from "@/pages/not-found";

// Pages
import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/app/dashboard";
import Projects from "@/pages/app/projects/index";
import ProjectWizard from "@/pages/app/projects/wizard";
import Billing from "@/pages/app/billing";
import Profile from "@/pages/app/profile";
import Admin from "@/pages/app/admin";
import Templates from "@/pages/app/templates";
import BrandKitPage from "@/pages/app/brand";
import SharePage from "@/pages/share";
import CreateBuilder from "@/pages/CreateBuilder";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // На клиентских ошибках (4xx) не повторяем — пользователь сразу видит ErrorState.
      // На 5xx и сетевых сбоях — до 2 повторов.
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number; response?: { status?: number } })?.status
          ?? (error as { response?: { status?: number } })?.response?.status;
        if (typeof status === "number" && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/share/:token" component={SharePage} />

      <Route path="/app">
        <Redirect to="/app/dashboard" />
      </Route>

      <Route path="/app/*">
        <ProtectedRoute>
          <AppLayout>
            <Switch>
              <Route path="/app/dashboard" component={Dashboard} />
              <Route path="/app/projects" component={Projects} />
              <Route path="/app/projects/new">
                <ProjectWizard isNew />
              </Route>
              <Route path="/app/projects/builder" component={CreateBuilder} />
              <Route path="/app/projects/:id">
                {params => <ProjectWizard projectId={params.id} />}
              </Route>
              <Route path="/app/templates" component={Templates} />
              <Route path="/app/brand" component={BrandKitPage} />
              <Route path="/app/billing" component={Billing} />
              <Route path="/app/profile" component={Profile} />
              
              <Route path="/app/admin">
                <ProtectedRoute adminOnly>
                  <Admin />
                </ProtectedRoute>
              </Route>
              
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
