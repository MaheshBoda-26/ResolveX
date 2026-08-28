import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme';
import { AppLayout } from '@/components/layout/AppLayout';
import { OperationsDashboardPage } from '@/pages/OperationsDashboardPage';
import { CustomerLandingPage } from '@/pages/CustomerLandingPage';
import { ChatPage } from '@/pages/ChatPage';
import { HandoffPage } from '@/pages/HandoffPage';
import { CaseDetailPage } from '@/pages/CaseDetailPage';
import { TracePage } from '@/pages/TracePage';
import { EvaluationsPage } from '@/pages/EvaluationsPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<OperationsDashboardPage />} />
        <Route path="/dashboard" element={<OperationsDashboardPage />} />
        <Route path="/support" element={<CustomerLandingPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/handoffs" element={<HandoffPage />} />
        <Route path="/handoffs/:id" element={<HandoffPage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/trace" element={<TracePage />} />
        <Route path="/evaluations" element={<EvaluationsPage />} />
        <Route path="*" element={<OperationsDashboardPage />} />
      </Routes>
    </AppLayout>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
