import { useState, ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans">
      <Header onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <main className="flex-1 pt-[48px] md:pl-[260px] min-h-[calc(100vh-48px)] flex flex-col">
        {children}
      </main>
    </div>
  );
}
