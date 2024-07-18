import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/default.css';
import './message.css';

export function createMessageElement(sender, message, isAI) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isAI ? 'ai' : 'user'}-message`;
  
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(lang, code).value;
            } else {
                return hljs.highlightAuto(code).value;
            }
        },
        langPrefix: 'hljs language-'
    });

    const parsedMessage = marked(message);
  
    messageElement.innerHTML = `
      <div class="message-content">
        ${isAI ? `<img class="profile-picture" src="https://static-00.iconduck.com/assets.00/ai-human-icon-256x256-j1bia0vl.png" alt="AI Profile Picture">` : `<img class="profile-picture" src="https://images.vexels.com/media/users/3/137047/isolated/lists/5831a17a290077c646a48c4db78a81bb-user-profile-blue-icon.png" alt="User Profile Picture">`}
        <div class="message-text">
          <div class="sender-name">
            ${sender}
          </div>
          <div class="message-body">${parsedMessage}</div>
        </div>
      </div>
    `;

    setTimeout(() => {
        messageElement.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }, 0);

    return messageElement;
}