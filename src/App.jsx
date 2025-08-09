import React, { Fragment, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Transition } from '@headlessui/react';
import './App.css'; 
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';

// main.js'den gelen API kütüphaneleri
import {
    GoogleGenerativeAI,
} from "@google/generative-ai";
import Groq from 'groq-sdk';
import { GoogleGenAI, Modality } from "@google/genai";

// API Anahtarları (Vite projenizde .env dosyasında olmalı)
const API_KEY_Gemini = import.meta.env.VITE_API_KEY_Gemini;
const API_KEY_Text_Bison = import.meta.env.VITE_API_KEY_Text_Bison;
const API_KEY_Llama = import.meta.env.VITE_API_KEY_Llama;

const App = () => {
  // --- State Yönetimi ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModelWindowOpen, setIsModelWindowOpen] = useState(false);
  const [isAboutScreenOpen, setIsAboutScreenOpen] = useState(false);
  const [isChangelogScreenOpen, setIsChangelogScreenOpen] = useState(false);
  
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  
  const [chatSessions, setChatSessions] = useState(() => {
    try {
        const savedSessions = localStorage.getItem('chatSessions');
        // AÇIKLAMA: Başlangıçta sadece kaydedilmiş (yani boş olmayan) sohbetler yüklenir.
        return savedSessions ? JSON.parse(savedSessions) : [];
    } catch (error) {
        return [];
    }
  });
  const [activeChatId, setActiveChatId] = useState(null);
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeInputText, setWelcomeInputText] = useState('');

  // --- Referanslar ---
  const [headerHeight, setHeaderHeight] = useState(0);
  const chatMessagesRef = useRef(null);
  const inputRef = useRef(null);

  // --- Türetilmiş State (Derived State) ---
  const activeChat = chatSessions.find(session => session.id === activeChatId);
  const chatMessages = activeChat ? activeChat.messages : [];
  const conversationHistory = activeChat ? activeChat.history : [];

  const chatContainerRef = useRef(null); 
  const topHeaderRef = useRef(null); 

  // --- Helper Fonksiyonlar ---
  const handleCycleModel = () => {
    if (models.length === 0) return;

    const currentIndex = models.findIndex(m => m.name === selectedModel);
    const nextIndex = (currentIndex + 1) % models.length; 
    const newModelName = models[nextIndex].name;
    
    setSelectedModel(newModelName);
    localStorage.setItem('model', newModelName);
  };
  const getCurrentDate = () => {
    const date = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} - ${days[date.getDay()]}`;
  };

  const getModelLabel = (modelName) => {
    if (!models.length) return 'nAI';
    const model = models.find(m => m.name === modelName);
    return model ? model.label : 'nAI';
  };
  
  const getSelectedModelObject = () => {
    if (!models.length || !selectedModel) return null;
    return models.find(m => m.name === selectedModel) || models[0];
  };

  // --- Effect'ler (Lifecycle) ---

  // `chatSessions` her değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // <--- DEĞİŞİKLİK: Sadece içinde mesaj olan sohbetler kaydedilecek şekilde güncellendi.
  useEffect(() => {
    // Bu, "Yeni Sohbet"e tıklanıp hiç mesaj yazılmayan durumları filtreler.
    // Böylece boş sohbetler kalıcı olarak saklanmaz.
    const nonEmptySessions = chatSessions.filter(session => session.messages.length > 0);
    localStorage.setItem('chatSessions', JSON.stringify(nonEmptySessions));
  }, [chatSessions]);

  // Modelleri yükle
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/models.json');
        const data = await response.json();
        setModels(data);
        const savedModel = localStorage.getItem('model');
        if (savedModel && data.some(m => m.name === savedModel)) {
          setSelectedModel(savedModel);
        } else {
          const defaultModel = data[0].name;
          setSelectedModel(defaultModel);
          localStorage.setItem('model', defaultModel);
        }
      } catch (error) {
        console.error("Failed to fetch models.json:", error);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Sohbeti yeniden adlandırma fonksiyonu
    const handleRenameSession = (sessionId, newTitle) => {
        setChatSessions(prev => 
            prev.map(session => 
                session.id === sessionId ? { ...session, title: newTitle } : session
            )
        );
    };
      
    useEffect(() => {
        const container = chatContainerRef.current;
        const handleScroll = () => {
            if (!container) return;
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
            const hasScrollbar = container.scrollHeight > container.clientHeight;
            setShowScrollDownButton(!isAtBottom && hasScrollbar);
        };

        if (container) {
            handleScroll();
            container.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [activeChatId, chatMessages]); 

      useEffect(() => {
      const handleResize = () => {
          // CSS'te kullanmak üzere gerçek görünür pencere yüksekliğini bir değişkene atar
          document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      };

      // İlk yüklemede yüksekliği ayarla
      handleResize();

      // Pencere yeniden boyutlandırıldığında yüksekliği tekrar ayarla
      window.addEventListener('resize', handleResize);

      // Component kaldırıldığında event listener'ı temizle
      return () => window.removeEventListener('resize', handleResize);
  }, []);

    // --- Yeni Sohbet Yönetim Fonksiyonları ---
    const handleNewChat = () => {
        // <--- DEĞİŞİKLİK BURADA BAŞLIYOR --->
        // Eğer zaten aktif bir sohbet varsa VE bu sohbetin içinde hiç mesaj yoksa,
        // yeni bir sohbet oluşturma ve işlemi durdur.
        if (activeChat && activeChat.messages.length === 0) {
            setIsSidebarOpen(false); // Eğer sidebar açıksa yine de kapatsın
            return; // Fonksiyondan çık ve yeni sohbet oluşturma
        }
        // <--- DEĞİŞİKLİK BURADA BİTİYOR --->

        const newChatId = Date.now();
        const newSession = {
            id: newChatId,
            title: 'New Chat',
            messages: [],
            history: [],
            model: selectedModel, // O anki seçili modeli bu sohbete kaydet
        };
        setChatSessions(prev => [newSession, ...prev]);
        setActiveChatId(newChatId);
        setIsSidebarOpen(false);
        return newChatId;
    };

    const handleSelectSession = (sessionId) => {
        // <--- DEĞİŞİKLİK BURADA BAŞLIYOR --->

        // Eğer kullanıcı zaten aktif olan sohbete tekrar tıklarsa bir şey yapma.
        if (sessionId === activeChatId) {
            setIsSidebarOpen(false);
            return;
        }

        // Geçiş yapmadan önce, şu anki aktif sohbeti bulalım.
        const currentActiveChat = chatSessions.find(s => s.id === activeChatId);

        // Eğer mevcut bir aktif sohbet varsa VE bu sohbetin içinde hiç mesaj yoksa,
        // sohbet listesinden bu boş sohbeti kaldır.
        if (currentActiveChat && currentActiveChat.messages.length === 0) {
            setChatSessions(prev => prev.filter(session => session.id !== activeChatId));
        }

        // Şimdi, normal geçiş işlemine devam et.
        // NOT: chatSessions state'i güncellenmiş olabileceğinden, yeni listeyi kullanmak
        // yerine doğrudan 'find' ile arama yapmak daha güvenlidir.
        const sessionToSelect = chatSessions.find(s => s.id === sessionId);
        if (sessionToSelect) {
            setActiveChatId(sessionId);
            setSelectedModel(sessionToSelect.model); // Sohbetin modelini aktif model yap
            setIsSidebarOpen(false);
        }
        // <--- DEĞİŞİKLİK BURADA BİTİYOR --->
    };

    const handleDeleteSession = (sessionId) => {
        setChatSessions(prev => prev.filter(session => session.id !== sessionId));
        if (activeChatId === sessionId) {
            // Aktif sohbet silindiyse seçimi kaldır ve hoşgeldin ekranına dön.
            // Zaten boş sohbetler kaydedilmediği için, silinen sohbetin
            // boş olma durumu dert değil.
            const remainingSessions = chatSessions.filter(s => s.id !== sessionId && s.messages.length > 0);
            if (remainingSessions.length > 0) {
              setActiveChatId(remainingSessions[0].id);
            } else {
              setActiveChatId(null);
            }
        }
    };

  const updateSessionData = (sessionId, data) => {
    setChatSessions(prev => prev.map(session => 
      session.id === sessionId ? { ...session, ...data } : session
    ));
  };

  const scrollToBottom = (behavior = 'smooth') => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: behavior,
            });
        }
    };

  useEffect(() => {
        const updateHeaderHeight = () => {
            if (topHeaderRef.current) {
                const height = topHeaderRef.current.offsetHeight;
                document.documentElement.style.setProperty('--header-height', `${height}px`);
            }
        };
        updateHeaderHeight();
        window.addEventListener('resize', updateHeaderHeight);
        return () => window.removeEventListener('resize', updateHeaderHeight);
    }, []);

     useEffect(() => {
        if (chatMessages.length > 0) {
           setTimeout(() => scrollToBottom('auto'), 0);
        }
    }, [chatMessages]);

    useEffect(() => {
        const container = chatContainerRef.current;
        const handleScroll = () => {
            if (container) {
                const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 1;
                const hasScrollbar = container.scrollHeight > container.clientHeight;
                setShowScrollDownButton(!isAtBottom && hasScrollbar);
            }
        };
        
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }
        handleScroll();

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [chatMessages, headerHeight]); 

    const handleStartChatWithPrompt = (prompt) => {
        const newChatId = handleNewChat(); 
        
        setTimeout(() => {
            setInputText(prompt);
        }, 0);
    };

    useEffect(() => {
        const setPadding = () => {
            if (topHeaderRef.current && chatContainerRef.current) {
                const headerHeight = topHeaderRef.current.offsetHeight;
                chatContainerRef.current.style.paddingTop = `${headerHeight}px`;
            }
        };

        setPadding();
        window.addEventListener('resize', setPadding);
        
        return () => window.removeEventListener('resize', setPadding);
    }, [activeChatId]); 

    const handleWelcomeInputChange = (e) => {
        const text = e.target.value;
        setWelcomeInputText(text);

        if (text.length === 1 && !activeChatId) {
            handleNewChat();
            setTimeout(() => {
                setInputText(text);
                inputRef.current?.focus();
            }, 100); 
        }
    };

  // --- Mesaj Yönetimi ---
  const appendMessage = (sender, message, isAI, profilePic, imageBase64 = null) => {
    // Bu fonksiyon artık doğrudan kullanılmıyor, handleSendMessage içindeki mantık daha güvenli.
    // Ancak referans olarak kalabilir veya silebilirsiniz.
  };

  // --- Ana Fonksiyonlar ---
  const handleModelChange = (newModelName) => {
        setSelectedModel(newModelName);
        localStorage.setItem('model', newModelName);
        
        if (activeChatId) {
            setChatSessions(prev => 
                prev.map(session => 
                    session.id === activeChatId ? { ...session, model: newModelName } : session
                )
            );
        }
    };

  const handleSendMessage = async () => {
    if (inputText.trim() === "" || isLoading) return;
    
    let currentChatId = activeChatId;
    
    // Aktif sohbet yoksa, yeni bir tane oluşturulur.
    // Bu senaryo normalde `handleWelcomeInputChange` ile yönetiliyor
    // ama bir güvenlik önlemi olarak burada durabilir.
    if (!currentChatId) {
        currentChatId = handleNewChat();
    }
    
    const userMessage = inputText.trim();
    // anlık state yerine `find` ile en güncel sohbeti alalım
    const currentActiveChat = chatSessions.find(s => s.id === currentChatId);
    if (!currentActiveChat) return; // Güvenlik kontrolü

    const model = getSelectedModelObject();
    
    const tempUserMessage = {
      id: Date.now(),
      sender: "User",
      message: userMessage,
      isAI: false,
      profilePic: "https://images.vexels.com/media/users/3/137047/isolated/lists/5831a17a290077c646a48c4db78a81bb-user-profile-blue-icon.png",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const tempUserHistoryEntry = { role: "user", content: userMessage };

    const updatedMessages = [...currentActiveChat.messages, tempUserMessage];
    const updatedHistory = [...currentActiveChat.history, tempUserHistoryEntry];
    
    let updatedTitle = currentActiveChat.title;
    // Eğer bu sohbetin ilk mesajıysa, başlığı otomatik oluştur
    if (currentActiveChat.messages.length === 0) {
        updatedTitle = userMessage.length > 30 ? userMessage.substring(0, 27) + "..." : userMessage;
    }
    
    updateSessionData(currentChatId, { 
      messages: updatedMessages, 
      history: updatedHistory,
      title: updatedTitle
    });

    setIsLoading(true);
    setInputText("");
    
    try {
        const currentDate = getCurrentDate();
        let aiMessageContent;
        let aiImageBase64 = null;

        // --- API ÇAĞRI BLOKLARI ---
        
        if (model.api_key === "API_KEY_Text_Bison") {
            const lastQ = userMessage;
            const lastA = updatedHistory.filter(h => h.role === 'model').pop()?.content || '!';
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta3/models/${model.model_name}:generateText?key=${API_KEY_Text_Bison}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    'prompt': { 'text': model.prompt.replace('${userMessage}', userMessage).replace('${q}', lastQ).replace('${a}', lastA).replace('${date}', currentDate) },
                    ...model.generation_config
                })
            });
            const data = await response.json();
            if (!response.ok || !data.candidates) throw new Error(data.error?.message || "Bison API error");
            aiMessageContent = data.candidates[0].output;
        } 
        else if (model.api_key === "API_KEY_GenAI_Content_Image") {
             const ai = new GoogleGenAI({ apiKey: API_KEY_Gemini });
             const genConfig = {
                 ...model.generation_config,
                 responseModalities: model.generation_config.responseModalitiesStrings.map(modalityString => {
                     if (modalityString === "TEXT") return Modality.TEXT;
                     if (modalityString === "IMAGE") return Modality.IMAGE;
                     return modalityString;
                 }),
             };
             const response = await ai.models.generateContent({ model: model.model_name, contents: userMessage, config: genConfig });
             let textResponse = "";
             if (response && response.candidates && response.candidates.length > 0) {
                 response.candidates[0].content.parts.forEach(part => {
                     if (part.text) textResponse += part.text + "\n";
                     else if (part.inlineData?.data) aiImageBase64 = part.inlineData.data;
                 });
                 aiMessageContent = textResponse.trim();
             } else {
                 throw new Error("Invalid response structure from Imagen model.");
             }
        }
        else if(model.api_key === "API_KEY_G/C" || model.api_key === "API_KEY_Gemini") {
            const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
            const modelZ = genAI.getGenerativeModel({ model: model.model_name, systemInstruction: model.prompt_parts.join(' ') });
            const formattedHistory = [
                { role: "user", parts: [{ text: "What is it today (Date/Month/Year - Day)" }] },
                { role: "model", parts: [{ text: currentDate }] },
                ...updatedHistory.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
            ];
            const chatSession = modelZ.startChat({ generationConfig: model.generation_config, history: formattedHistory });
            const result = await chatSession.sendMessage(userMessage);
            aiMessageContent = result.response.text();
        }
        else if(model.api_key === "API_KEY_Llama"){
            const groq = new Groq({ apiKey: API_KEY_Llama, dangerouslyAllowBrowser: true });
            const formattedHistoryForLlama = updatedHistory.map(msg => ({
                role: msg.role === "model" ? "assistant" : "user",
                content: msg.content
            }));
            const response = await groq.chat.completions.create({
                "messages": [
                    { "role": "system", "content": model.prompt_parts.join(' ') },
                    { "role": "user", "content": `Current date is: ${currentDate}` },
                    { "role": "assistant", "content": "Okay, I am aware of the date." },
                    ...formattedHistoryForLlama,
                ],
                "model": model.model_name,
                ...model.generation_config
            });
            aiMessageContent = response.choices[0]?.message?.content || '';
        } else {
            throw new Error(`Unknown or unhandled model API key type: ${model.api_key}`);
        }
        
        const aiMessage = {
          id: Date.now() + 1,
          sender: model.label,
          message: aiMessageContent,
          isAI: true,
          profilePic: model.AIPP,
          imageBase64: aiImageBase64,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const aiHistoryEntry = {
          role: "model",
          content: aiMessageContent || "[Image Generated]"
        };

        updateSessionData(currentChatId, {
          messages: [...updatedMessages, aiMessage],
          history: [...updatedHistory, aiHistoryEntry]
        });

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: "System Error",
        message: `An error occurred: ${error.message}`,
        isAI: true,
        profilePic: "https://i.imgur.com/2Rs5ya9.png",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      updateSessionData(currentChatId, {
        messages: [...updatedMessages, errorMessage]
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
      setTimeout(() => scrollToBottom('auto'), 0);
    }
  };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputText.trim()) {
                handleSendMessage();
            }
        }
    };

  // --- Modal Toggle Fonksiyonları ---
  const toggleModelWindow = () => setIsModelWindowOpen(!isModelWindowOpen);
  const toggleAboutScreen = () => setIsAboutScreenOpen(!isAboutScreenOpen);
  const toggleChangelogScreen = () => setIsChangelogScreenOpen(!isChangelogScreenOpen);
  
  // <--- AÇIKLAMA: Geri kalan JSX (render) kısmında bir değişiklik yapmaya gerek yoktur.
  // State yönetimi doğru yapıldığı için arayüz beklenen şekilde davranacaktır.
  return (
     <div 
        className="flex bg-gray-900 text-gray-100 font-sans overflow-hidden"
        style={{ height: 'var(--app-height, 100vh)' }}
     >
        <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            sessions={chatSessions}
            activeSessionId={activeChatId}
            onSessionSelect={handleSelectSession}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            onToggleSettings={toggleModelWindow}
            onToggleAbout={toggleAboutScreen}
            onToggleChangelog={toggleChangelogScreen}
        />
        
        {/* DEĞİŞİKLİK BURADA BAŞLIYOR: YAN BAR İÇİN OVERLAY EKLENDİ */}

        {/* 
          Bu overlay, sadece yan bar açıkken ve ekran genişliği "md" breakpoint'inden küçükken görünür olur.
          Geniş ekranlarda (PC), yan bar sabit olduğu için bu overlay render edilmez.
          Tıklandığında, Sidebar'ı kapatmak için onClose fonksiyonunu çağırır.
        */}
        <AnimatePresence>
            {isSidebarOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                />
            )}
        </AnimatePresence>
        
        {/* DEĞİŞİKLİK BURADA BİTİYOR */}

      
        <main className="relative flex-1 flex flex-col h-full transition-all duration-300 md:ml-72">
            {/* ... main içeriğinin geri kalanı (AnimatePresence ve diğerleri) tamamen aynı kalacak ... */}

            <AnimatePresence mode="wait">
                {!activeChatId ? (
                    // --- DURUM 1: KARŞILAMA EKRANI ---
                    <motion.div
                      key="welcome-screen"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className="flex flex-col h-full w-full"
                    >
                        <header className="p-4 flex items-center min-h-[60px] flex-shrink-0">
                            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-full hover:bg-gray-700 md:hidden">
                                <i className="fas fa-bars"></i>
                            </button>
                        </header>
                        <div className="flex-1 flex flex-col justify-center items-center text-center overflow-y-auto p-4 sm:p-6">
                            <div className="flex flex-col items-center max-w-3xl w-full">
                                <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                                    Meet nAI
                                </h1>
                                <p className="text-lg text-gray-400 mb-10">
                                    Unleash your creativity!
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    {/* Prompt-cards */}
                                    <div onClick={() => handleStartChatWithPrompt("Write a React component for a timer")} className="prompt-card p-4 rounded-lg cursor-pointer">...</div>
                                    <div onClick={() => handleStartChatWithPrompt("Draft a blog post about the future of AI")} className="prompt-card p-4 rounded-lg cursor-pointer">...</div>
                                    <div onClick={() => handleStartChatWithPrompt("Suggest a weekly meal plan")} className="prompt-card p-4 rounded-lg cursor-pointer">...</div>
                                    <div onClick={() => handleStartChatWithPrompt("What is the biggest mystery of the universe?")} className="prompt-card p-4 rounded-lg cursor-pointer">...</div>
                                </div>
                            </div>
                        </div>
                        <div className="w-full max-w-2xl mx-auto px-4 pb-4 flex-shrink-0">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    value={welcomeInputText}
                                    onChange={handleWelcomeInputChange}
                                    placeholder="Type your message to start..."
                                    className="w-full p-4 pl-6 pr-14 rounded-full text-white fake-input-bar outline-none"
                                />
                                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white">
                                    <i className="fas fa-arrow-up"></i>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">nAI can make mistakes. Consider checking important information.</p>
                        </div>
                    </motion.div>
                ) : (
                    // --- DURUM 2: SOHBET ARAYÜZÜ ---
                    <motion.div
                        key="chat-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col h-full w-full"
                    >
                        <header ref={topHeaderRef} className="top-header p-4 flex items-center justify-between min-h-[60px] flex-shrink-0">
                          <div className="flex items-center gap-4">
                            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-full hover:bg-gray-700 md:hidden">
                              <i className="fas fa-bars"></i>
                            </button>
                            <Menu as="div" className="relative inline-block text-left">
                                {/* Menu içeriği */}
                            </Menu>
                          </div>
                          <div className="flex items-center">
                             <button onClick={handleNewChat} className="p-2 rounded-full hover:bg-gray-700" title="New Chat">
                                <i className="fas fa-edit"></i>
                             </button>
                          </div>
                        </header>
                        <div className="relative flex-1 overflow-hidden">
                            <div 
                                ref={chatContainerRef} 
                                className="h-full overflow-y-auto p-4 md:p-6"
                                style={{ paddingTop: 'var(--header-height)', scrollPaddingTop: 'var(--header-height)', WebkitOverflowScrolling: 'touch' }}
                            >
                                {chatMessages.map((msg) => (
                                   <ChatMessage key={msg.id} message={msg} />
                                ))}
                            </div>
                            <AnimatePresence>
                            {showScrollDownButton && (
                                <motion.button onClick={() => scrollToBottom()} className="scroll-down-button" title="Scroll to bottom">
                                    <i className="fas fa-arrow-down"></i>
                                </motion.button>
                            )}
                            </AnimatePresence>
                        </div>
                        <motion.div className="w-full bg-gray-800 flex items-center p-4 border-t border-gray-700 z-10 flex-shrink-0">
                                <input 
                                    ref={inputRef} 
                                    type="text" 
                                    value={inputText} 
                                    onChange={(e) => setInputText(e.target.value)} 
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type your message..." 
                                    className="flex-1 p-3 mr-4 rounded-lg border-none bg-gray-900 text-gray-100 outline-none" 
                                    disabled={isLoading} />
                              <button id="send-button-id" onClick={handleSendMessage} disabled={isLoading || !inputText.trim()} className="...">
                                  {isLoading ? (<span className="animate-pulse text-lg">● ● ●</span>) : ('Send')}
                              </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
      {/* DEĞİŞİKLİK BURADA BİTİYOR */}


      {/* --- MODAL PENCERELER (DEĞİŞİKLİK YOK) --- */}
      {isModelWindowOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setIsModelWindowOpen(false)}>
          <div className="bg-gray-800 p-6 rounded-3xl shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-4 right-4 cursor-pointer text-xl" onClick={() => setIsModelWindowOpen(false)}>×</div>
            <h5 className="mb-4 text-lg">Use Model:</h5>
            <select value={selectedModel} onChange={handleModelChange} className="p-3 border-none rounded-lg bg-gray-900 text-white outline-none cursor-pointer min-w-[200px]">
              {models.map((model) => (
                <option key={model.name} value={model.name} className="bg-gray-900 text-white">
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isAboutScreenOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setIsAboutScreenOpen(false)}>
            <div className="bg-gray-800 p-6 rounded-3xl shadow-xl max-w-[90vw] md:max-w-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-4 right-4 cursor-pointer text-xl" onClick={() => setIsAboutScreenOpen(false)}>×</div>
                <div className="text-left">
                    <h3 className="text-xl font-bold mb-4">Project nAI</h3>
                    <h4 className="text-lg font-semibold mb-3">nAI Project: Exploring Open Source Fine-Tuned AI Models</h4>
                    <p className="mb-4 text-gray-300">Welcome to Project nAI! Our mission is to bridge the gap between closed-source models using prompts and open-source models, facilitating their educational use. We curate a collection of effective prompts and fine-tuned models in a single platform. Contributors are encouraged to add models via JSON configuration. Currently, we feature prompts for Bison, Gemini, and GPT models, with plans for continuous expansion (Claude, Llama etc.). Please note that the project is in its early stages, leveraging Vite for a basic UI, ensuring it can be easily run locally by anyone interested.</p>
                    <h4 className="text-lg font-semibold mb-3">About</h4>
                    <p className="text-gray-300">Project nAI started with the goal of exploring and integrating fine-tuned versions of Gemini, GPT, and open-source models, fostering experimentation and learning within the AI community. Our platform supports developers and researchers in testing these models, promoting transparency, and fostering collaboration.</p>
                </div>
            </div>
         </div>
      )}

      {isChangelogScreenOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setIsChangelogScreenOpen(false)}>
            <div className="bg-gray-800 p-6 rounded-3xl shadow-xl max-w-[90vw] md:max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-4 right-4 cursor-pointer text-xl" onClick={() => setIsChangelogScreenOpen(false)}>×</div>
                <h3 className="text-xl font-bold mb-4">Changelog</h3>
                <div className="max-h-[50vh] overflow-y-auto text-gray-300">
                    <div className="mb-4"><div className="font-bold text-white">2025-01-13</div><div>Updated the used model.</div></div>
                    <div className="mb-4"><div className="font-bold text-white">2024-06-07</div><div>Added new feature: Clear the chat.</div></div>
                    <div className="mb-4"><div className="font-bold text-white">2024-06-06</div><div>Fixed bug related to model changing.</div></div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};


export default App;