
import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import LiveVoiceInterface from './components/LiveVoiceInterface';
import { Message, ChatSession, LiveTranscription, Attachment } from './types';
import { GeminiChatService, IbrahimModel } from './services/geminiService';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<IbrahimModel>('ibrahim-3-flash');
  const [chatService] = useState<GeminiChatService>(new GeminiChatService());

  const currentChat = chatSessions.find(s => s.id === currentChatId);

  const createNewChat = useCallback(() => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: []
    };
    setChatSessions(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (chatSessions.length === 0) {
      createNewChat();
    }
  }, [chatSessions.length, createNewChat]);

  const handleSendMessage = async (text: string, attachment?: Attachment) => {
    if (!currentChatId || isGenerating) return;
    
    setIsGenerating(true);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
      attachment
    };

    setChatSessions(prev => prev.map(s => {
      if (s.id === currentChatId) {
        return {
          ...s,
          title: s.messages.length === 0 ? text.substring(0, 30) || 'Image Analysis' : s.title,
          messages: [...s.messages, userMessage]
        };
      }
      return s;
    }));

    const modelMessageId = (Date.now() + 1).toString();
    const modelMessage: Message = {
      id: modelMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now()
    };

    setChatSessions(prev => prev.map(s => {
      if (s.id === currentChatId) {
        return { ...s, messages: [...s.messages, modelMessage] };
      }
      return s;
    }));

    try {
      let fullText = '';
      const stream = chatService.sendMessageStream(
        text, 
        selectedModel,
        attachment ? { data: attachment.data, mimeType: attachment.mimeType } : undefined
      );
      
      for await (const chunk of stream) {
        fullText += chunk;
        setChatSessions(prev => prev.map(s => {
          if (s.id === currentChatId) {
            const updatedMessages = s.messages.map(m => 
              m.id === modelMessageId ? { ...m, text: fullText } : m
            );
            return { ...s, messages: updatedMessages };
          }
          return s;
        }));
      }
    } catch (err) {
      console.error("Chat Error:", err);
      setChatSessions(prev => prev.map(s => {
        if (s.id === currentChatId) {
          return {
            ...s,
            messages: s.messages.map(m => 
              m.id === modelMessageId ? { ...m, text: "দুঃখিত, কোনো একটি সমস্যা হয়েছে।" } : m
            )
          };
        }
        return s;
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLiveSession = (history: LiveTranscription[]) => {
    if (!currentChatId || history.length === 0) return;

    const newMessages: Message[] = history.map((t, idx) => ({
      id: `live-${t.timestamp}-${idx}`,
      role: t.role,
      text: t.text,
      timestamp: t.timestamp
    }));

    setChatSessions(prev => prev.map(s => {
      if (s.id === currentChatId) {
        return {
          ...s,
          title: s.messages.length === 0 ? history[0].text.substring(0, 30) : s.title,
          messages: [...s.messages, ...newMessages]
        };
      }
      return s;
    }));
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] overflow-hidden">
      <Sidebar 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onNewChat={createNewChat}
        recentChats={chatSessions.filter(s => s.messages.length > 0)}
        currentChatId={currentChatId}
        onSelectChat={(id) => {
          setCurrentChatId(id);
          if (window.innerWidth < 1024) setSidebarOpen(false);
        }}
      />
      
      <main className="flex-1 relative overflow-hidden">
        <ChatInterface 
          messages={currentChat?.messages || []}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onLiveStart={() => setIsLiveActive(true)}
          toggleSidebar={toggleSidebar}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
        
        {isLiveActive && (
          <LiveVoiceInterface 
            onClose={() => setIsLiveActive(false)} 
            onSaveSession={handleSaveLiveSession}
          />
        )}
      </main>
    </div>
  );
};

export default App;
