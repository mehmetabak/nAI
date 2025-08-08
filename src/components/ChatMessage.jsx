// src/components/ChatMessage.jsx
import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css'; 
import './ChatMessage.css'; 

// highlight.js'i marked ile çalışacak şekilde ayarla
marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-', // CSS class uyumluluğu için
  breaks: true, // Satır sonlarını <br> olarak işle
});

const ChatMessage = ({ message }) => {
  const { sender, message: text, isAI, profilePic, imageBase64, timestamp } = message;
  const messageRef = useRef(null);

  // Markdown'u HTML'e çevir
  const parsedMessage = text ? marked.parse(text) : '';

  useEffect(() => {
    if (messageRef.current) {
      // Tüm kod bloklarını bul
      const codeBlocks = messageRef.current.querySelectorAll('pre');
      
      codeBlocks.forEach((preElement) => {
        if (preElement.parentNode.classList.contains('code-block-wrapper')) {
          return;
        }

        const codeText = preElement.querySelector('code')?.innerText || '';

        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';

        // pre elementini sarmalayıcının içine taşı
        preElement.parentNode.insertBefore(wrapper, preElement);
        wrapper.appendChild(preElement);
        
        // Kopyala butonu oluştur
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

        // Butonu sarmalayıcının içine ekle
        wrapper.appendChild(copyButton);
      });

      // highlight.js'i çalıştır (bunu en sona almak daha güvenli)
      messageRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }, [message]); // Her mesaj render edildiğinde bu kontrolü yap

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
        
        {parsedMessage && (
          <div className="message-body" dangerouslySetInnerHTML={{ __html: parsedMessage }} />
        )}
        
        {imageBase64 && (
          <div className="message-image-container">
            <img
              src={`data:image/png;base64,${imageBase64}`}
              alt="Generated Content"
              className="generated-image"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;