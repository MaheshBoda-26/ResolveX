import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/shared/lib/theme';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { OperationsDashboardPage } from '@/features/dashboard/OperationsDashboardPage';
import { CustomerLandingPage } from '@/features/dashboard/CustomerLandingPage';
import { ChatPage } from '@/features/chat/ChatPage';
import { HandoffPage } from '@/features/handoff/HandoffPage';
import { CaseDetailPage } from '@/features/handoff/CaseDetailPage';
import { TracePage } from '@/features/trace/TracePage';
import { EvaluationsPage } from '@/features/evaluations/EvaluationsPage';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

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
