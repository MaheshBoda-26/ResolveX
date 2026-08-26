import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { OperationsDashboardPage } from '@/pages/OperationsDashboardPage';
import { ResolutionTimeline } from '@/components/ResolutionTimeline';

const queryClient = new QueryClient();

describe('ResolveX Enterprise UI Components', () => {
  it('renders the top Header with brand logo and navigation items', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <Header />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('ResolveX')).toBeDefined();
    expect(screen.getByText('Operations')).toBeDefined();
    expect(screen.getByText('Support Chat')).toBeDefined();
  });

  it('renders the Sidebar navigation with active sections', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <Sidebar />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('ResolveX Engine')).toBeDefined();
    expect(screen.getByText('Handoff Queue')).toBeDefined();
    expect(screen.getByText('Agent Trace Log')).toBeDefined();
    expect(screen.getByText('AI Evaluations')).toBeDefined();
  });

  it('renders Operations Dashboard KPI overview cards', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <OperationsDashboardPage />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Resolution Overview')).toBeDefined();
    expect(screen.getByText('Autonomous Res')).toBeDefined();
    expect(screen.getByText('Active AI Agent Swarm')).toBeDefined();
  });

  it('renders Resolution Timeline steps', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <ResolutionTimeline caseId="RX-10482" />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Resolution Timeline')).toBeDefined();
    expect(screen.getByText('Understand')).toBeDefined();
    expect(screen.getByText('Investigate')).toBeDefined();
  });
});
