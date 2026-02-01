
import React from 'react';
import { GreenStarLogo } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNewChat: () => void;
  recentChats: { id: string, title: string }[];
  currentChatId: string;
  onSelectChat: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen, 
  onNewChat, 
  recentChats, 
  currentChatId,
  onSelectChat
}) => {
  return (
    <div className={`fixed lg:relative z-40 transition-all duration-300 ease-in-out h-full bg-[#1e1f20] flex flex-col ${isOpen ? 'w-[300px]' : 'w-0 lg:w-[68px]'} overflow-hidden`}>
      <div className="flex flex-col h-full py-4 px-3">
        {/* Menu Toggle */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 hover:bg-[#333537] rounded-full transition-colors self-start mb-6"
        >
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* New Chat Button */}
        <button 
          onClick={onNewChat}
          className={`flex items-center gap-3 bg-[#131314] hover:bg-[#333537] transition-colors rounded-full text-sm font-medium text-gray-400 py-3 mb-8 ${isOpen ? 'px-4 w-fit' : 'px-2 justify-center'}`}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isOpen && <span>New chat</span>}
        </button>

        {/* Recent Chats */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3">Recent</h3>
            <div className="space-y-1">
              {recentChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#333537] rounded-lg transition-colors text-left truncate ${currentChatId === chat.id ? 'bg-[#333537]' : ''}`}
                >
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div className="mt-auto space-y-1">
          <button className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#333537] rounded-lg transition-colors ${!isOpen ? 'justify-center' : ''}`}>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {isOpen && <span>Help</span>}
          </button>
          <button className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#333537] rounded-lg transition-colors ${!isOpen ? 'justify-center' : ''}`}>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {isOpen && <span>Activity</span>}
          </button>
          <button className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#333537] rounded-lg transition-colors ${!isOpen ? 'justify-center' : ''}`}>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             {isOpen && <span>Settings</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
