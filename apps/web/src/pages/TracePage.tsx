'use client';

import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trace } from '@/components/Trace';

export function TracePage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');

  return (
    <div className="min-h-screen bg-background-default dark:bg-background-dark flex flex-col">
      <header className="p-4 border-b border-border-default bg-surface-default dark:bg-surface-dark">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-h2 font-bold text-brand-primary">Agent Trace</h1>
          {runId && (
            <Badge variant="secondary" className="ml-auto font-mono text-trace-mono">
              {runId.slice(0, 8)}...
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        {runId ? (
          <Trace runId={runId} />
        ) : (
          <Card className="max-w-xl mx-auto mt-12">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-primary-soft flex items-center justify-center">
                <Zap className="h-8 w-8 text-brand-primary" />
              </div>
              <h2 className="text-h3 font-semibold mb-2">No Trace Selected</h2>
              <p className="text-body text-text-secondary mb-6">
                Select a conversation from the chat view to see the agent trace for that interaction.
              </p>
              <Button variant="primary" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chat
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}