import { marked } from 'marked';
import './message.css';

export function createMessageElement(sender, message, isAI) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isAI ? 'ai' : 'user'}-message`;
  
    const parsedMessage = marked(message);
  
    messageElement.innerHTML = `
      <div class="message-content">
        ${isAI ? `<img class="profile-picture" src="https://static-00.iconduck.com/assets.00/ai-human-icon-256x256-j1bia0vl.png" alt="AI Profile Picture">` : ''}
        <div class="message-text">
          <strong class="sender-name">${sender}</strong>
          <p>${parsedMessage}</p>
        </div>
        ${isAI ? '' : `<img class="profile-picture" src="https://images.vexels.com/media/users/3/137047/isolated/lists/5831a17a290077c646a48c4db78a81bb-user-profile-blue-icon.png" alt="User Profile Picture">`}
      </div>
    `;
    return messageElement;
  }