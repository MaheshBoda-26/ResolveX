import { VOICE_DEFAULTS } from '@resolvex/shared/constants';

export interface ElevenLabsConfig {
  agentId: string;
  apiKey: string;
  model?: string;
  voiceId?: string;
}

export interface VoiceEventHandlers {
  onUserSpeech?: (transcript: string) => void;
  onAgentResponse?: (text: string) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
  onAudioLevel?: (level: number) => void;
}

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceCallbacks {
  onStateChange?: (state: VoiceState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAgentText?: (text: string) => void;
  onError?: (error: Error) => void;
  onAudioLevel?: (level: number) => void;
}

class ElevenLabsClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private config: ElevenLabsConfig | null = null;
  private callbacks: VoiceCallbacks = {};
  private state: VoiceState = 'idle';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  setCallbacks(callbacks: VoiceCallbacks) {
    this.callbacks = callbacks;
  }

  private setState(state: VoiceState) {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  async connect(config: ElevenLabsConfig): Promise<void> {
    this.config = config;
    this.setState('connecting');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const level = Math.sqrt(inputData.reduce((sum, val) => sum + val * val, 0) / inputData.length);
        this.callbacks.onAudioLevel?.(level);

        if (this.ws?.readyState === WebSocket.OPEN) {
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          this.ws.send(pcm16.buffer);
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${config.agentId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('listening');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(event.data));
          this.handleMessage(data);
        } catch {
          // Handle binary audio response
          this.playAudio(event.data);
        }
      };

      this.ws.onerror = (error) => {
        this.callbacks.onError?.(new Error('WebSocket error'));
      };

      this.ws.onclose = () => {
        this.cleanup();
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(config), 1000 * this.reconnectAttempts);
        } else {
          this.setState('error');
        }
      };
    } catch (error) {
      this.setState('error');
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  private handleMessage(data: unknown) {
    const msg = data as { type: string; text?: string; transcript?: string; is_final?: boolean };

    switch (msg.type) {
      case 'user_transcript':
        if (msg.transcript) {
          this.callbacks.onTranscript?.(msg.transcript, msg.is_final ?? false);
        }
        break;
      case 'agent_response':
        if (msg.text) {
          this.setState('speaking');
          this.callbacks.onAgentText?.(msg.text);
        }
        break;
      case 'agent_response_end':
        this.setState('listening');
        break;
      case 'error':
        this.callbacks.onError?.(new Error(msg.text || 'Unknown error'));
        break;
    }
  }

  private async playAudio(arrayBuffer: ArrayBuffer) {
    if (!this.audioContext) return;

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch {
      // Ignore audio playback errors
    }
  }

  disconnect(): void {
    this.cleanup();
    this.setState('idle');
  }

  private cleanup(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getState(): VoiceState {
    return this.state;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const elevenLabsClient = new ElevenLabsClient();

export function createElevenLabsConfig(agentId: string, apiKey: string): ElevenLabsConfig {
  return {
    agentId,
    apiKey,
    model: VOICE_DEFAULTS.MODEL,
    voiceId: VOICE_DEFAULTS.VOICE_ID,
  };
}