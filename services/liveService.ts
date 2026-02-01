
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

// Custom Base64 helpers
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const createAudioBlob = (data: Float32Array): Blob => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
};

export class LiveService {
  private session: any;
  private audioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private analyzer: AnalyserNode | null = null;
  private isConnected = false;
  private frameInterval: number | null = null;

  constructor(
    private callbacks: {
      onTranscription: (text: string, role: 'user' | 'model') => void;
      onError: (err: any) => void;
      onClose: () => void;
      onVolumeChange?: (volume: number) => void;
    }
  ) {}

  async connect(config: { 
    voiceName?: string, 
    useCamera?: boolean, 
    facingMode?: 'user' | 'environment',
    videoElement?: HTMLVideoElement 
  }) {
    this.disconnect();

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      throw new Error("SECURE_CONTEXT_REQUIRED");
    }

    // 1. Media Acquisition
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: config.useCamera ? { facingMode: config.facingMode || 'user' } : false
      });
      
      if (config.useCamera && config.videoElement && this.stream.getVideoTracks().length > 0) {
        config.videoElement.srcObject = this.stream;
      }
    } catch (e: any) {
      console.error("Live Media Error:", e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        throw new Error("MEDIA_PERMISSION_DENIED");
      }
      throw e;
    }

    // 2. Audio Processing Setup
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();
    if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 256;

    // 3. AI SDK Initialization
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          this.isConnected = true;
          if (!this.stream || !this.audioContext) return;

          // Audio Input
          const audioTrack = this.stream.getAudioTracks()[0];
          const source = this.audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
          source.connect(this.analyzer!);

          const scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            if (!this.isConnected) return;
            const inputData = e.inputBuffer.getChannelData(0);
            
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const vol = Math.sqrt(sum / inputData.length);
            this.callbacks.onVolumeChange?.(vol);

            const pcmBlob = createAudioBlob(inputData);
            sessionPromise.then(s => {
              try { s.sendRealtimeInput({ media: pcmBlob }); } catch(err) {}
            });
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(this.audioContext.destination);

          // Video Input (Frames)
          if (config.useCamera && config.videoElement) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            this.frameInterval = window.setInterval(() => {
              if (!this.isConnected || !config.videoElement) return;
              
              canvas.width = config.videoElement.videoWidth / 2 || 640;
              canvas.height = config.videoElement.videoHeight / 2 || 480;
              ctx?.drawImage(config.videoElement, 0, 0, canvas.width, canvas.height);
              
              canvas.toBlob((blob) => {
                if (blob) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    sessionPromise.then(s => {
                      try { s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }); } catch(err) {}
                    });
                  };
                  reader.readAsDataURL(blob);
                }
              }, 'image/jpeg', 0.6);
            }, 1000); // 1 frame per second is usually enough for visual context
          }
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) {
            this.callbacks.onTranscription(message.serverContent.outputTranscription.text, 'model');
          } else if (message.serverContent?.inputTranscription) {
            this.callbacks.onTranscription(message.serverContent.inputTranscription.text, 'user');
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            this.playAudio(base64Audio);
          }

          if (message.serverContent?.interrupted) {
            this.stopAllAudio();
          }
        },
        onerror: (e) => {
          this.isConnected = false;
          console.error("Live Service Error:", e);
          this.callbacks.onError(e);
        },
        onclose: () => {
          this.isConnected = false;
          this.callbacks.onClose();
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName || 'Zephyr' } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: `You are Ibrahim AI Pro, a direct competitor to Gemini with a focus on speed and natural conversation.
        Rules:
        - You are in a Live Talk mode.
        - You can process audio and visual input (camera frames) in real-time.
        - You speak Bengali and English.
        - Keep responses human-like, natural, and concise.
        - If you see something through the camera, describe it or answer questions about it naturally.`,
      },
    });

    this.session = await sessionPromise;
  }

  applyZoom(zoom: number) {
    if (this.stream) {
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities() as any;
        if (capabilities.zoom) {
          videoTrack.applyConstraints({ advanced: [{ zoom }] as any });
        }
      }
    }
  }

  private async playAudio(base64: string) {
    if (!this.outputAudioContext) return;
    try {
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      const audioBuffer = await decodeAudioData(decode(base64), this.outputAudioContext, 24000, 1);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);
      source.addEventListener('ended', () => this.sources.delete(source));
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  }

  private stopAllAudio() {
    this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  disconnect() {
    this.isConnected = false;
    this.stopAllAudio();
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    if (this.session) {
      try { this.session.close(); } catch(e) {}
      this.session = null;
    }
  }
}
