// src/components/ChatMessage.jsx

import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css'; 
import './ChatMessage.css'; 

marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-',
  breaks: true,
});

const ChatMessage = ({ message }) => {
  const { sender, message: text, isAI, profilePic, imageBase64, timestamp } = message;
  const messageRef = useRef(null);

  const parsedMessage = text ? marked.parse(text) : '';

  useEffect(() => {
    // Kopyala butonu ve kod bloğu mantığı (değişiklik yok)
    if (messageRef.current) {
      const codeBlocks = messageRef.current.querySelectorAll('pre');
      codeBlocks.forEach((preElement) => {
        if (preElement.parentNode.classList.contains('code-block-wrapper')) return;
        const codeText = preElement.querySelector('code')?.innerText || '';
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        preElement.parentNode.insertBefore(wrapper, preElement);
        wrapper.appendChild(preElement);
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-button';
        copyButton.innerHTML = '<i class="far fa-copy"></i> Copy';
        copyButton.onclick = () => {
          navigator.clipboard.writeText(codeText).then(() => {
            copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyButton.style.backgroundColor = '#2a9d8f'; // Yeşil renk
            setTimeout(() => {
              copyButton.innerHTML = '<i class="far fa-copy"></i> Copy';
              copyButton.style.backgroundColor = ''; // Rengi sıfırla
            }, 2000);
          }).catch(err => {
            console.error('Failed to copy: ', err);
            copyButton.innerText = 'Error';
          });
        };
        wrapper.appendChild(copyButton);
      });
      messageRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }, [message]);

  return (
    <div
      ref={messageRef}
      className={`message-container ${isAI ? 'ai-message' : 'user-message'}`}
    >
      <img
        src={profilePic}
        alt={sender}
        className="profile-picture"
      />
      <div className="message-content">
        <div className="sender-info">
          <span className="sender-name">{sender}</span>
          <span className="timestamp">{timestamp}</span>
        </div>
        
        {/* === YENİ MANTIK BURADA BAŞLIYOR === */}

        {/* 1. Eğer AI mesajıysa ve içerik (metin ve resim) henüz yoksa "Thinking..." göster */}
        {isAI && !text && !imageBase64 && (
          <div className="thinking-indicator">Thinking</div>
        )}

        {/* 2. Metin içeriği varsa, normal şekilde göster */}
        {parsedMessage && (
          <div className="message-body" dangerouslySetInnerHTML={{ __html: parsedMessage }} />
        )}
        
        {/* 3. Resim içeriği varsa, normal şekilde göster */}
        {imageBase64 && (
          <div className="message-image-container">
            <img
              src={`data:image/png;base64,${imageBase64}`}
              alt="Generated Content"
              className="generated-image"
            />
          </div>
        )}
        {/* === YENİ MANTIK BURADA BİTİYOR === */}
      </div>
    </div>
  );
};

export default ChatMessage;