
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Message, Attachment } from '../types';
import { GreenStarLogo } from '../constants';
import { IbrahimModel } from '../services/geminiService';

const StreamingText = memo(({ text, isStreaming }: { text: string; isStreaming: boolean }) => {
  // Check if text is an image result
  if (text.startsWith('IMAGE_GENERATED:')) {
    const imageUrl = text.replace('IMAGE_GENERATED:', '');
    return (
      <div className="mt-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500 max-w-lg">
        <img src={imageUrl} alt="AI Generated" className="w-full h-auto" />
      </div>
    );
  }

  const [displayedText, setDisplayedText] = useState(text);
  const queueRef = useRef<string>(text);

  useEffect(() => {
    queueRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      return;
    }

    const interval = setInterval(() => {
      setDisplayedText((prev) => {
        if (prev.length < queueRef.current.length) {
          const diff = queueRef.current.length - prev.length;
          const jump = diff > 20 ? 5 : 2;
          return queueRef.current.slice(0, prev.length + jump);
        }
        return prev;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [isStreaming, text]);

  return <p className="text-[#e3e3e3] whitespace-pre-wrap leading-relaxed text-[15px] md:text-[16px]">{isStreaming ? displayedText : text}</p>;
});

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, attachment?: Attachment) => void;
  isGenerating: boolean;
  onLiveStart: () => void;
  toggleSidebar: () => void;
  selectedModel: IbrahimModel;
  onModelChange: (model: IbrahimModel) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isGenerating,
  onLiveStart,
  toggleSidebar,
  selectedModel,
  onModelChange
}) => {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<Attachment | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const MODELS = [
    { id: 'ibrahim-3-flash', name: 'Ibrahim 3 Flash', desc: 'Fastest for everyday tasks', icon: '⚡' },
    { id: 'ibrahim-2.5-pro', name: 'Ibrahim 2.5 Pro', desc: 'Complex reasoning & coding', icon: '💎' },
    { id: 'ibrahim-3-thinking', name: 'Ibrahim 3 Thinking', desc: 'Deep logical analysis', icon: '🧠' },
    { id: 'ibrahim-image-maker', name: 'Ibrahim Image Maker', desc: 'Creative image generation', icon: '🎨' },
  ] as const;

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'bn-BD'; 

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setInput(prev => prev + (prev.length > 0 ? ' ' : '') + finalTranscript);
      };
      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleDictation = () => {
    if (!recognitionRef.current) return alert("Browser not supported");
    isDictating ? recognitionRef.current.stop() : (setIsDictating(true), recognitionRef.current.start());
  };

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating, shouldAutoScroll]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile({
        data: (reader.result as string).split(',')[1],
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isDictating) recognitionRef.current.stop();
    if ((input.trim() || selectedFile) && !isGenerating) {
      setShouldAutoScroll(true);
      onSendMessage(input, selectedFile || undefined);
      setInput('');
      setSelectedFile(null);
    }
  };

  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  return (
    <div className="flex-1 flex flex-col items-center bg-[#131314] h-full relative">
      <header className="w-full h-16 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 bg-[#131314]/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
          {/* History Button - Always Visible */}
          <button 
            onClick={toggleSidebar}
            className="p-2.5 hover:bg-[#333537] rounded-full transition-colors text-gray-400"
            title="History"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {/* Model Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#333537] rounded-lg transition-colors group"
            >
              <span className="text-lg font-medium text-gray-200">{currentModel.name}</span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </button>

            {showModelMenu && (
              <>
                <div className="fixed inset-0" onClick={() => setShowModelMenu(false)} />
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#1e1f20] border border-[#3c4043] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onModelChange(m.id);
                        setShowModelMenu(false);
                      }}
                      className={`w-full flex items-start gap-4 px-4 py-3 hover:bg-[#333537] transition-colors text-left ${selectedModel === m.id ? 'bg-[#333537]' : ''}`}
                    >
                      <span className="text-xl mt-0.5">{m.icon}</span>
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${selectedModel === m.id ? 'text-blue-400' : 'text-gray-200'}`}>{m.name}</span>
                        <span className="text-xs text-gray-500">{m.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold border border-white/10 shadow-lg">I</div>
        </div>
      </header>

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scroll"
      >
        <div className="max-w-4xl mx-auto w-full flex flex-col min-h-full">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center py-12 px-6">
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-medium gemini-gradient mb-6 leading-tight">
                  Hello, Ibrahim
                </h1>
                <p className="text-xl md:text-2xl text-gray-500 font-medium">
                  {selectedModel === 'ibrahim-image-maker' ? 'আমি আপনার জন্য কী ছবি তৈরি করবো?' : 'আমি আপনাকে কিভাবে সাহায্য করতে পারি?'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {[
                  { title: selectedModel === 'ibrahim-image-maker' ? "একটি ফিউচারিস্টিক শহর" : "এই ছবিটির বর্ণনা দাও", icon: "🖼️" },
                  { title: "Python স্ক্রিপ্ট লেখো", icon: "🐍" },
                  { title: "একটি ভ্রমণের পরিকল্পনা", icon: "✈️" },
                  { title: "আইডিয়া জেনারেট করো", icon: "💡" },
                ].map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => onSendMessage(s.title)}
                    className="p-4 bg-[#1e1f20] hover:bg-[#333537] rounded-xl text-left transition-colors flex flex-col justify-between h-32 group border border-transparent hover:border-gray-700"
                  >
                    <span className="text-sm text-gray-300 font-medium">{s.title}</span>
                    <div className="self-end p-2 bg-[#131314] rounded-full text-xl group-hover:scale-110 transition-transform shadow-inner">
                      {s.icon}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8 py-8 px-4 md:px-0">
              {messages.map((msg, idx) => {
                const isLastModelMessage = msg.role === 'model' && idx === messages.length - 1;
                return (
                  <div key={msg.id} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'model' && (
                      <div className="flex-shrink-0 mt-1">
                        <GreenStarLogo className="w-6 h-6" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl ${msg.role === 'user' ? 'bg-[#1e1f20] px-5 py-3 border border-gray-800' : 'px-1 py-1 flex flex-col gap-3'}`}>
                      {msg.attachment && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-sm shadow-lg">
                          {msg.attachment.mimeType.startsWith('image/') ? (
                            <img src={msg.attachment.url} alt="Uploaded" className="w-full h-auto object-cover" />
                          ) : (
                            <video src={msg.attachment.url} controls className="w-full h-auto" />
                          )}
                        </div>
                      )}
                      {msg.role === 'model' ? (
                        <StreamingText text={msg.text} isStreaming={isLastModelMessage && isGenerating} />
                      ) : (
                        <p className="text-[#e3e3e3] whitespace-pre-wrap leading-relaxed text-[15px] md:text-[16px]">{msg.text}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {isGenerating && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4 animate-pulse">
                   <div className="flex-shrink-0 mt-1">
                      <GreenStarLogo className="w-6 h-6 opacity-50" />
                   </div>
                   <div className="flex flex-col gap-2 mt-3 w-1/2">
                      <div className="h-2 bg-gray-700 rounded w-full"></div>
                      <div className="h-2 bg-gray-700 rounded w-3/4"></div>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl px-4 pb-6 pt-2 shrink-0 bg-[#131314]">
        {selectedFile && (
          <div className="mb-2 p-2 bg-[#1e1f20] border border-gray-700 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0">
               {selectedFile.mimeType.startsWith('image/') ? (
                 <img src={selectedFile.url} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
                 </div>
               )}
            </div>
            <span className="text-xs text-gray-400 flex-1 truncate">File attached</span>
            <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}

        <form 
          onSubmit={handleSubmit}
          className="relative bg-[#1e1f20] rounded-[28px] p-1 shadow-2xl border border-[#3c4043] focus-within:border-gray-500 focus-within:bg-[#232425] transition-all"
        >
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder={isDictating ? "শুনছি..." : (selectedModel === 'ibrahim-image-maker' ? "কী ছবি তৈরি করবো লিখুন..." : "এখানে লিখুন...")}
            className={`w-full bg-transparent text-[#e3e3e3] px-6 py-4 resize-none outline-none min-h-[56px] max-h-48 text-[16px] transition-all ${isDictating ? 'placeholder-blue-400' : ''}`}
            rows={1}
          />
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
               <button 
                type="button" onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-[#333537] rounded-full text-gray-400 transition-colors" title="Upload"
               >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
               </button>

               <button 
                type="button" onClick={toggleDictation}
                className={`p-2 rounded-full transition-all ${isDictating ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-[#333537] text-gray-400'}`} title="Voice"
               >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
               </button>

               <button type="button" onClick={onLiveStart} className="p-2 hover:bg-[#333537] rounded-full text-gray-400 transition-colors" title="Live Talk">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
               </button>
            </div>
            <button 
              type="submit"
              disabled={(!input.trim() && !selectedFile) || isGenerating}
              className={`p-2 rounded-full transition-all ${(input.trim() || selectedFile) && !isGenerating ? 'bg-blue-600 text-white hover:bg-blue-500 scale-105 shadow-md' : 'text-gray-600'}`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </form>
        <p className="text-[11px] text-center text-gray-500 mt-2 px-4 select-none">
          Ibrahim AI Pro can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
