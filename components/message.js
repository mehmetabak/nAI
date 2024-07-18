import { marked } from 'marked';
import hljs from 'highlight.js';
import './message.css';

export function createMessageElement(sender, message, isAI) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isAI ? 'ai' : 'user'}-message`;
  
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    });

    const parsedMessage = marked(message);
  
    messageElement.innerHTML = `
      <div class="message-content">
        ${isAI ? `<img class="profile-picture" src="https://static-00.iconduck.com/assets.00/ai-human-icon-256x256-j1bia0vl.png" alt="AI Profile Picture">` : `<img class="profile-picture" src="https://images.vexels.com/media/users/3/137047/isolated/lists/5831a17a290077c646a48c4db78a81bb-user-profile-blue-icon.png" alt="User Profile Picture">`}
        <div class="message-text">
          <div class="sender-name">
            ${sender}
          </div>
          <p>${parsedMessage}</p>
        </div>
      </div>
    `;
    return messageElement;
  }