'use client';

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HandoffList } from '@/components/HandoffList';
import { CaseBrief } from '@/components/CaseBrief';
import { useHandoff, useAcceptHandoff, useCompleteHandoff } from '@/lib/api';

export function HandoffPage() {
  const navigate = useNavigate();
  const params = useParams();
  const handoffId = params.id;

  const [selectedHandoff, setSelectedHandoff] = useState<import('@/lib/api').Handoff | null>(null);

  const { data: handoff, isLoading: isLoadingDetail, error: detailError } = useHandoff(handoffId);
  const acceptMutation = useAcceptHandoff();
  const completeMutation = useCompleteHandoff();

  const handleAccept = async () => {
    if (selectedHandoff) {
      await acceptMutation.mutateAsync(selectedHandoff.id);
    }
  };

  const handleComplete = async () => {
    if (selectedHandoff) {
      await completeMutation.mutateAsync(selectedHandoff.id);
    }
  };

  // Detail view
  if (handoffId) {
    if (isLoadingDetail) {
      return (
        <div className="min-h-screen bg-background-default dark:bg-background-dark flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
        </div>
      );
    }

    if (detailError || !handoff) {
      return (
        <div className="min-h-screen bg-background-default dark:bg-background-dark flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <h1 className="text-h2 font-bold text-text-primary mb-2">Handoff Not Found</h1>
            <p className="text-body text-text-muted mb-6">The requested handoff could not be loaded.</p>
            <Button onClick={() => navigate('/handoffs')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Handoffs
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background-default dark:bg-background-dark">
        <header className="border-b border-border-default bg-surface-default dark:bg-surface-dark sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/handoffs')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-h3 font-bold text-text-primary">Case Brief</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6 pb-16">
          <CaseBrief
            handoff={handoff}
            onAccept={handleAccept}
            onComplete={handleComplete}
            isAccepting={acceptMutation.isPending}
            isCompleting={completeMutation.isPending}
          />
        </main>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background-default dark:bg-background-dark">
      <header className="border-b border-border-default bg-surface-default dark:bg-surface-dark sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-h2 font-bold text-brand-primary">Operator Handoffs</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 pb-16">
        <HandoffList onSelect={(handoff) => setSelectedHandoff(handoff)} />

        {selectedHandoff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedHandoff(null)}>
            <div className="bg-surface-default dark:bg-surface-dark rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <CaseBrief
                handoff={selectedHandoff}
                onAccept={handleAccept}
                onComplete={handleComplete}
                isAccepting={acceptMutation.isPending}
                isCompleting={completeMutation.isPending}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}