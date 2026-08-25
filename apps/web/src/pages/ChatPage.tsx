'use client';

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, X, MessageSquare, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Chat } from '@/components/Chat';
import { useConversations, Conversation } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { data: conversations, isLoading, refetch } = useConversations();

  const handleNewConversation = () => {
    navigate('/chat');
    setMobileSidebarOpen(false);
  };

  const handleConversationClick = (id: string) => {
    navigate(`/chat?conversation=${id}`);
    setMobileSidebarOpen(false);
  };

  const handleConversationCreated = (id: string) => {
    navigate(`/chat?conversation=${id}`, { replace: true });
    refetch();
  };

  return (
    <div className="min-h-screen bg-background-default dark:bg-background-dark flex">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative z-50 w-80 bg-surface-default dark:bg-surface-dark border-r border-border-default dark:border-border-dark flex flex-col transition-transform duration-200',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-4 border-b border-border-default flex items-center justify-between">
          <h1 className="text-h2 font-bold text-brand-primary">ResolveX</h1>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-secondary-soft"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Button
            variant="primary"
            className="w-full justify-start gap-2"
            onClick={handleNewConversation}
          >
            <MessageSquare className="h-5 w-5" />
            New Conversation
          </Button>

          <Separator className="my-2" />

          <h3 className="text-small font-medium text-text-muted px-2">Recent</h3>
          {isLoading ? (
            <div className="space-y-2 px-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-secondary-soft rounded-lg animate-pulse" />
              ))}
            </div>
          ) : conversations?.length === 0 ? (
            <p className="text-body text-text-muted px-2 py-4 text-center">No conversations yet</p>
          ) : (
            <ul className="space-y-1 px-2" role="list">
              {conversations?.slice(0, 10).map((conv: Conversation) => (
                <li key={conv.id}>
                  <button
                    onClick={() => handleConversationClick(conv.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg hover:bg-secondary-soft transition-colors',
                      conversationId === conv.id && 'bg-brand-primary-soft text-brand-primary'
                    )}
                  >
                    <p className="text-body-medium truncate font-medium">
                      {conv.messages[0]?.content ?? 'Empty conversation'}
                    </p>
                    <p className="text-caption text-text-muted mt-0.5 truncate">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="p-4 border-t border-border-default">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={toggleTheme}>
            {theme === 'dark' ? <List className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:ml-0 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden p-4 border-b border-border-default flex items-center justify-between">
          <button
            className="p-2 rounded-lg hover:bg-secondary-soft"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-h3 font-bold text-brand-primary">ResolveX</h1>
          <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <List className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
          </Button>
        </header>

        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          <Chat
            conversationId={conversationId ?? undefined}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </main>
    </div>
  );
}