import { useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Chat } from '@/components/Chat';
import { ResolutionTimeline } from '@/components/ResolutionTimeline';
import { useConversations, Conversation } from '@/lib/api';

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const conversationId = searchParams.get('conversation');
  const [showTimeline, setShowTimeline] = useState(true);

  const { data: conversations, refetch } = useConversations();
  const initialMsg = location.state?.initialMessage;

  const handleConversationSelect = (id: string) => {
    setSearchParams({ conversation: id });
  };

  const handleConversationCreated = (id: string) => {
    setSearchParams({ conversation: id }, { replace: true });
    refetch();
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-48px)] overflow-hidden bg-background">
      {/* Top Support Context Header */}
      <div className="px-4 py-2.5 bg-surface-container-lowest border-b border-outline-variant/40 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            SJ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-on-surface">Sarah Jenkins (Gold Tier)</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-container text-on-primary-container">
                Case RX-10482
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Issue: Duplicate Charge $120.00 • Autonomous Agent Assigned
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History selector */}
          <select
            value={conversationId || ''}
            onChange={(e) => e.target.value && handleConversationSelect(e.target.value)}
            className="px-2.5 py-1 text-xs border border-outline-variant/60 rounded-lg bg-surface text-on-surface font-medium outline-none"
          >
            <option value="">+ New Conversation</option>
            {conversations?.map((conv: Conversation) => (
              <option key={conv.id} value={conv.id}>
                {conv.messages[0]?.content.slice(0, 30) || 'Active Chat'} ({new Date(conv.updatedAt).toLocaleTimeString()})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 ${
              showTimeline
                ? 'bg-primary-container/20 border-primary text-primary'
                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">timeline</span>
            {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
          </button>
        </div>
      </div>

      {/* Split Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden border-r border-outline-variant/30">
          <Chat
            conversationId={conversationId ?? undefined}
            onConversationCreated={handleConversationCreated}
            initialMessage={initialMsg}
          />
        </div>

        {/* Resolution Timeline Panel (Right side) */}
        {showTimeline && (
          <div className="hidden lg:block w-[360px] xl:w-[400px] h-full overflow-y-auto p-4 bg-surface-bright/50 border-l border-outline-variant/40 scrollbar-thin">
            <ResolutionTimeline caseId="RX-10482" />
          </div>
        )}
      </div>
    </div>
  );
}