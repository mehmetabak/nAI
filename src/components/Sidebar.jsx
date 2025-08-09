// Sidebar.js

import React, { useState, useEffect, useRef } from 'react';

// ChatSessionItem bileşeni aynı kalabilir, değişiklik yok.
const ChatSessionItem = ({ session, isActive, onSelect, onDelete, onRename }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(session.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    if (title.trim() && title.trim() !== session.title) {
      onRename(session.id, title.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setTitle(session.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      onClick={() => !isEditing && onSelect(session.id)}
      className={`group flex w-full cursor-pointer items-center justify-between rounded-lg p-2 text-sm transition-colors ${
        isActive ? 'bg-gray-700' : 'hover:bg-gray-700/50'
      }`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-white outline-none"
        />
      ) : (
        <span className="truncate">{session.title}</span>
      )}
      
      {!isEditing && (
        <div className={`flex items-center gap-2 transition-opacity ${
            isActive 
              ? 'opacity-100' 
              : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
          }`}
        >
          <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-white" title="Rename">
            <i className="fas fa-pen text-xs"></i>
          </button>
          <button onClick={() => onDelete(session.id)} className="p-1 text-gray-400 hover:text-white" title="Delete">
            <i className="fas fa-trash text-xs"></i>
          </button>
        </div>
      )}
    </div>
  );
};


const Sidebar = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onToggleSettings,
  onToggleAbout,
  onToggleChangelog,
}) => {
  
  return (
    <>
      {/* Mobilde arkaplan karartması için overlay */}
      {isOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={onClose}></div>}
      
      {/* DEĞİŞİKLİK 1: `h-screen` kaldırıldı, `style` eklendi. */}
      {/* DEĞİŞİKLİK 2: `md:translate-x-0` kaldırıldı. Artık tüm ekran boyutlarında görünürlük `isOpen` state'ine bağlı. */}
      <aside
        className={`fixed top-0 left-0 z-40 w-72 bg-gray-800 text-white transition-transform transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ height: 'var(--app-height, 100vh)' }}
      >
        <div className="flex h-full flex-col">
          
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-lg font-bold tracking-wide">nAI History</h1>
              {/* Kapatma butonu mobilde solda, PC'de sağda olacak */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors md:hidden"
                aria-label="Close Sidebar"
              >
                <i className="fas fa-arrow-left" />
              </button>
            </div>
            <button
              onClick={onNewChat}
              className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <span>New Chat</span>
              <i className="fas fa-plus" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4">
            <h2 className="mb-2 text-xs font-bold uppercase text-gray-400">History</h2>
            <div className="flex flex-col gap-2">
              {sessions.map((session) => (
                <ChatSessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  onSelect={onSessionSelect}
                  onDelete={onDeleteSession}
                  onRename={onRenameSession}
                />
              ))}
            </div>
          </div>
          
          <div className="border-t border-gray-700 p-4">
            <nav className="flex flex-col gap-1">
              <button onClick={onToggleSettings} className="flex items-center rounded px-2 py-2 hover:bg-gray-700 transition-colors">
                <i className="fas fa-cog mr-3 w-4 text-center" /> Settings
              </button>
              <button onClick={onToggleAbout} className="flex items-center rounded px-2 py-2 hover:bg-gray-700 transition-colors">
                <i className="fas fa-info-circle mr-3 w-4 text-center" /> About
              </button>
              <button onClick={onToggleChangelog} className="flex items-center rounded px-2 py-2 hover:bg-gray-700 transition-colors">
                <i className="fas fa-box-open mr-3 w-4 text-center" /> What's New
              </button>
              <a href="https://github.com/mehmetabak/nAI" target="_blank" rel="noopener noreferrer" className="flex items-center rounded px-2 py-2 hover:bg-gray-700 transition-colors">
                <i className="fab fa-github mr-3 w-4 text-center" /> Source Code
              </a>
            </nav>
          </div>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;