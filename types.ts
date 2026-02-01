
export type Role = 'user' | 'model';

export interface Attachment {
  data: string;
  mimeType: string;
  url: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  attachment?: Attachment;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export interface LiveTranscription {
  text: string;
  role: Role;
  timestamp: number;
}
