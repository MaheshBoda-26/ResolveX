'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSendMessage, Message } from '@/lib/api';
import DOMPurify from 'dompurify';
import { VoiceInput } from '@/components/VoiceInput';
import { createElevenLabsConfig } from '@/lib/elevenlabs';

interface ChatProps {
  conversationId: string | undefined;
  onConversationCreated: (id: string) => void;
  initialMessage?: string;
}

export function Chat({ conversationId, onConversationCreated }: ChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const sendMutation = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);

  const sanitizeContent = (content: string): string => {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'br', 'p', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMutation.isPending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentMessage = message;
    setMessage('');

    try {
      const response = await sendMutation.mutateAsync({
        message: currentMessage,
        conversationId,
      });

      const assistantMessage: Message = {
        ...response.message,
        role: 'assistant',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!conversationId) {
        onConversationCreated(response.conversationId);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-default dark:bg-background-dark">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6 space-y-4" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3 max-w-[800px] mx-auto w-full',
              msg.role === 'user' && 'flex-row-reverse'
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-caption font-medium',
                msg.role === 'user'
                  ? 'bg-brand-primary text-white'
                  : 'bg-secondary-soft text-text-secondary dark:bg-secondary-default'
              )}
              aria-hidden="true"
            >
              {msg.role === 'user' ? 'U' : 'A'}
            </div>
            <div
              className={cn(
                'max-w-[calc(100%-40px)] rounded-card px-4 py-3',
                msg.role === 'user'
                  ? 'bg-brand-primary text-white rounded-br-none'
                  : 'bg-surface-default dark:bg-surface-dark border border-border-default dark:border-border-dark rounded-bl-none'
              )}
            >
              <p className="text-body whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeContent(msg.content) }} />
              <p className={cn('mt-1 text-caption', msg.role === 'user' ? 'text-brand-primary-soft' : 'text-text-muted')}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {sendMutation.isPending && (
          <div className="flex gap-3 max-w-[800px] mx-auto w-full" aria-live="polite">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-caption font-medium bg-secondary-soft text-text-secondary dark:bg-secondary-default" aria-hidden="true">
              A
            </div>
            <div className="max-w-[calc(100%-40px)] rounded-card bg-surface-default dark:bg-surface-dark border border-border-default dark:border-border-dark rounded-bl-none px-4 py-3">
              <div className="flex gap-1 items-center" role="status" aria-label="AI is typing">
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} aria-hidden="true" />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} aria-hidden="true" />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} aria-hidden="true" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <Separator className="mx-6" />

      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sendMutation.isPending}
            className="flex-1"
            aria-label="Message input"
          />
          <VoiceInput
            config={createElevenLabsConfig('agent_01')}
            onTranscript={(text, isFinal) => {
              if (isFinal && text.trim()) {
                setMessage(text);
              }
            }}
            className="h-control"
          />
          <Button type="submit" disabled={!message.trim() || sendMutation.isPending} className="h-control" aria-label="Send message">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}