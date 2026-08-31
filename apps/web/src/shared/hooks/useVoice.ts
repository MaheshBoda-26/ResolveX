import { useState, useCallback, useRef, useEffect } from 'react';
import { elevenLabsClient, VoiceState, VoiceCallbacks, ElevenLabsConfig } from '@/shared/lib/elevenlabs';

// ElevenLabs WebSocket message types
export interface ElevenLabsUserTranscriptMessage {
  type: 'user_transcript';
  transcript: string;
  is_final: boolean;
}

export interface ElevenLabsAgentResponseMessage {
  type: 'agent_response';
  text: string;
}

export interface ElevenLabsAgentResponseEndMessage {
  type: 'agent_response_end';
}

export interface ElevenLabsErrorMessage {
  type: 'error';
  text: string;
}

export interface ElevenLabsPingMessage {
  type: 'ping';
  event_id: number;
}

export interface ElevenLabsPongMessage {
  type: 'pong';
  event_id: number;
}

export interface ElevenLabsAudioMessage {
  type: 'audio';
  audio: ArrayBuffer;
}

export type ElevenLabsIncomingMessage =
  | ElevenLabsUserTranscriptMessage
  | ElevenLabsAgentResponseMessage
  | ElevenLabsAgentResponseEndMessage
  | ElevenLabsErrorMessage
  | ElevenLabsPingMessage
  | ElevenLabsPongMessage
  | ElevenLabsAudioMessage;

export interface UseVoiceOptions {
  config: ElevenLabsConfig;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAgentResponse?: (text: string) => void;
  onError?: (error: Error) => void;
}

export interface UseVoiceReturn {
  state: VoiceState;
  audioLevel: number;
  isConnected: boolean;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
}

export function useVoice({
  config,
  onTranscript,
  onAgentResponse,
  onError,
}: UseVoiceOptions): UseVoiceReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const callbacksRef = useRef<VoiceCallbacks>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const callbacks: VoiceCallbacks = {
      onStateChange: (newState) => {
        if (mountedRef.current) {
          setState(newState);
          setIsConnected(newState === 'listening' || newState === 'processing' || newState === 'speaking');
        }
      },
      onTranscript: (text, isFinal) => {
        if (mountedRef.current) {
          onTranscript?.(text, isFinal);
        }
      },
      onAgentText: (text) => {
        if (mountedRef.current) {
          onAgentResponse?.(text);
        }
      },
      onError: (error) => {
        if (mountedRef.current) {
          onError?.(error);
        }
      },
      onAudioLevel: (level) => {
        if (mountedRef.current) {
          setAudioLevel(level);
        }
      },
    };

    callbacksRef.current = callbacks;
    elevenLabsClient.setCallbacks(callbacks);
  }, [onTranscript, onAgentResponse, onError]);

  const start = useCallback(async () => {
    if (state === 'connecting' || state === 'listening') return;
    try {
      await elevenLabsClient.connect(config);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [config, state, onError]);

  const stop = useCallback(() => {
    elevenLabsClient.disconnect();
  }, []);

  const toggle = useCallback(async () => {
    if (state === 'idle' || state === 'error') {
      await start();
    } else {
      stop();
    }
  }, [state, start, stop]);

  return {
    state,
    audioLevel,
    isConnected,
    start,
    stop,
    toggle,
  };
}