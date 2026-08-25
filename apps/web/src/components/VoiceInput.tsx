'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVoice, UseVoiceOptions } from '@/hooks/useVoice';

interface VoiceInputProps extends Omit<UseVoiceOptions, 'config'> {
  config: UseVoiceOptions['config'];
  className?: string;
  onTranscriptFinal?: (text: string) => void;
}

export function VoiceInput({
  config,
  onTranscript,
  onAgentResponse,
  onError,
  className,
}: VoiceInputProps) {
  const {
    state,
    audioLevel,
    start,
    stop,
  } = useVoice({ config, onTranscript, onAgentResponse, onError });

  const [showVisualizer, setShowVisualizer] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioLevelHistory = useRef<number[]>([]);

  useEffect(() => {
    if (state === 'listening' || state === 'processing' || state === 'speaking') {
      setShowVisualizer(true);
      animateVisualizer();
    } else {
      setShowVisualizer(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [state, audioLevel]);

  const animateVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    audioLevelHistory.current.push(audioLevel);
    if (audioLevelHistory.current.length > 50) {
      audioLevelHistory.current.shift();
    }

    const barWidth = width / 50;
    const maxHeight = height * 0.8;

    audioLevelHistory.current.forEach((level, i) => {
      const barHeight = Math.max(4, level * maxHeight * 10);
      const x = i * barWidth + barWidth * 0.1;
      const y = height - barHeight;

      const gradient = ctx.createLinearGradient(0, height, 0, y);
      gradient.addColorStop(0, 'hsl(220, 90%, 60%)');
      gradient.addColorStop(1, 'hsl(260, 90%, 70%)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);
    });

    animationRef.current = requestAnimationFrame(animateVisualizer);
  };

  const getStateLabel = () => {
    switch (state) {
      case 'idle':
        return 'Click to start';
      case 'connecting':
        return 'Connecting...';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'Speaking...';
      case 'error':
        return 'Error - click to retry';
      default:
        return '';
    }
  };

  const getButtonVariant = () => {
    switch (state) {
      case 'listening':
      case 'processing':
      case 'speaking':
        return 'destructive' as const;
      case 'connecting':
        return 'secondary' as const;
      case 'error':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  const handleClick = async () => {
    if (state === 'idle' || state === 'error') {
      await start();
    } else {
      stop();
    }
  };

  return (
    <div className={cn('relative flex flex-col items-center gap-3', className)}>
      <div className="relative">
        <Button
          onClick={handleClick}
          variant={getButtonVariant()}
          size="lg"
          className={cn(
            'h-16 w-16 rounded-full transition-all duration-200',
            state === 'listening' && 'animate-pulse shadow-lg shadow-brand-primary/30',
            state === 'processing' && 'animate-spin',
            state === 'speaking' && 'animate-pulse shadow-lg shadow-brand-secondary/30',
          )}
          aria-label={getStateLabel()}
          aria-pressed={state !== 'idle' && state !== 'error'}
          disabled={state === 'connecting'}
        >
          {state === 'connecting' && (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          )}
          {state === 'listening' && <Mic className="h-6 w-6" aria-hidden="true" />}
          {state === 'processing' && <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />}
          {state === 'speaking' && <Volume2 className="h-6 w-6" aria-hidden="true" />}
          {(state === 'idle' || state === 'error') && <MicOff className="h-6 w-6" aria-hidden="true" />}
        </Button>

        {showVisualizer && (
          <div className="absolute inset-0 rounded-full border-2 border-brand-primary/30 animate-pulse pointer-events-none" />
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={120}
        height={40}
        className={cn('rounded-lg bg-surface-default dark:bg-surface-dark', !showVisualizer && 'hidden')}
        aria-hidden="true"
      />

      <p className="text-caption text-text-muted text-center max-w-xs">
        {getStateLabel()}
      </p>

      {state === 'listening' && (
        <div className="flex items-center gap-1 text-caption text-brand-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
          </span>
          <span>Live</span>
        </div>
      )}
    </div>
  );
}