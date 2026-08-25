'use client';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme';
import { ChatPage } from '@/pages/ChatPage';
import { TracePage } from '@/pages/TracePage';
import { HandoffPage } from '@/pages/HandoffPage';

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
    <Routes>
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/trace" element={<TracePage />} />
      <Route path="/handoffs" element={<HandoffPage />} />
      <Route path="/handoffs/:id" element={<HandoffPage />} />
      <Route path="/" element={<ChatPage />} />
      <Route path="*" element={<ChatPage />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}