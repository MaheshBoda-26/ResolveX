'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSendMessage, Message } from '@/lib/api';

interface ChatProps {
  conversationId: string | undefined;
  onConversationCreated: (id: string) => void;
  initialMessage?: string;
}

export function Chat({ conversationId, onConversationCreated }: ChatProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
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

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    if (isListening) {
      // Stop listening
    } else {
      // Start listening - would integrate with ElevenLabs
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-default dark:bg-background-dark">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6 space-y-4">
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
              <p className="text-body whitespace-pre-wrap">{msg.content}</p>
              <p className={cn('mt-1 text-caption', msg.role === 'user' ? 'text-brand-primary-soft' : 'text-text-muted')}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {sendMutation.isPending && (
          <div className="flex gap-3 max-w-[800px] mx-auto w-full">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-caption font-medium bg-secondary-soft text-text-secondary dark:bg-secondary-default">
              A
            </div>
            <div className="max-w-[calc(100%-40px)] rounded-card bg-surface-default dark:bg-surface-dark border border-border-default dark:border-border-dark rounded-bl-none px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleVoiceInput}
            className={cn('h-control', isListening && 'bg-brand-primary-soft text-brand-primary')}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={isListening}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button type="submit" disabled={!message.trim() || sendMutation.isPending} className="h-control">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}