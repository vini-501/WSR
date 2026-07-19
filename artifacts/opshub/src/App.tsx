import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/theme-provider';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Pages
import { Login } from '@/pages/auth/Login';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { Profile } from '@/pages/auth/Profile';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { DepartmentsList } from '@/pages/departments/DepartmentsList';
import { DepartmentDetail } from '@/pages/departments/DepartmentDetail';
import { EmployeesList } from '@/pages/employees/EmployeesList';
import { EmployeeDetail } from '@/pages/employees/EmployeeDetail';
import { ReportsList } from '@/pages/reports/ReportsList';
import { ReportForm } from '@/pages/reports/ReportForm';
import { ReportDetail } from '@/pages/reports/ReportDetail';
import { Management } from '@/pages/management/Management';
import { Analytics } from '@/pages/management/Analytics';
import { Notifications } from '@/pages/notifications/Notifications';
import { ActivityLogs } from '@/pages/logs/ActivityLogs';
import { AuditLogs } from '@/pages/logs/AuditLogs';
import { Settings } from '@/pages/settings/Settings';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      <Route path="/departments">
        <ProtectedRoute allowedRoles={['admin', 'management']}>
          <DepartmentsList />
        </ProtectedRoute>
      </Route>

      <Route path="/departments/:id">
        <ProtectedRoute allowedRoles={['admin', 'management']}>
          <DepartmentDetail />
        </ProtectedRoute>
      </Route>

      <Route path="/employees">
        <ProtectedRoute allowedRoles={['admin', 'management', 'department_head']}>
          <EmployeesList />
        </ProtectedRoute>
      </Route>

      <Route path="/employees/:id">
        <ProtectedRoute allowedRoles={['admin', 'management']}>
          <EmployeeDetail />
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <ReportsList />
        </ProtectedRoute>
      </Route>

      <Route path="/reports/new">
        <ProtectedRoute allowedRoles={['employee']}>
          <ReportForm />
        </ProtectedRoute>
      </Route>

      <Route path="/reports/:id">
        <ProtectedRoute>
          <ReportDetail />
        </ProtectedRoute>
      </Route>

      <Route path="/reports/:id/edit">
        <ProtectedRoute allowedRoles={['employee']}>
          <ReportForm />
        </ProtectedRoute>
      </Route>

      <Route path="/management">
        <ProtectedRoute allowedRoles={['admin', 'management']}>
          <Management />
        </ProtectedRoute>
      </Route>

      <Route path="/analytics">
        <ProtectedRoute allowedRoles={['admin', 'management']}>
          <Analytics />
        </ProtectedRoute>
      </Route>

      <Route path="/notifications">
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      </Route>

      <Route path="/activity-logs">
        <ProtectedRoute allowedRoles={['admin', 'management']}>
          <ActivityLogs />
        </ProtectedRoute>
      </Route>

      <Route path="/audit-logs">
        <ProtectedRoute allowedRoles={['admin']}>
          <AuditLogs />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute allowedRoles={['admin']}>
          <Settings />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="opshub-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;