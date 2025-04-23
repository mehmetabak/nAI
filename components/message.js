// message.js
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css'; // Ensure your bundler handles this
import './message.css';

export function createMessageElement(sender, message, isAI, AIPP, imageBase64 = null) { // Added imageBase64 param
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isAI ? 'ai' : 'user'}-message`;

    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-' // CSS class prefix
    });

    // Process text message (Markdown), handle null/empty safely
    const parsedMessage = message ? marked(message) : '';

    // Determine profile picture source
    const profilePicSrc = isAI ? AIPP : 'https://images.vexels.com/media/users/3/137047/isolated/lists/5831a17a290077c646a48c4db78a81bb-user-profile-blue-icon.png';

    // Build the inner HTML structure
    let messageInnerHtml = `
      <div class="message-content">
        <img class="profile-picture" src="${profilePicSrc}" alt="${sender} Profile Picture">
        <div class="message-text">
          <div class="sender-name">${sender}</div>
          ${parsedMessage ? `<div class="message-body">${parsedMessage}</div>` : ''}
        </div>
      </div>
    `; // Add message-body only if there's text

    // If it's an AI message and there's image data, append the image
    if (isAI && imageBase64) {
        // Basic MIME type detection (can be enhanced)
        let mimeType = 'image/png'; // Default
        if (imageBase64.startsWith('data:image/jpeg')) mimeType = 'image/jpeg';
        else if (imageBase64.startsWith('data:image/webp')) mimeType = 'image/webp';
        // Add more types if needed

        // Ensure base64 prefix is present
        const imageSrc = imageBase64.startsWith('data:image') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`;

        // Find the message-text div to append the image container into it
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = messageInnerHtml; // Parse the current structure

        const messageTextDiv = tempContainer.querySelector('.message-text');
        if (messageTextDiv) {
            // Create image container and image element
            const imageContainer = document.createElement('div');
            imageContainer.className = 'message-image-container';
            const imgElement = document.createElement('img');
            imgElement.src = imageSrc;
            imgElement.alt = 'Generated Image';
            imgElement.className = 'generated-image';
            imageContainer.appendChild(imgElement);

            // Append the image container after the text body (if exists) or sender name
            const messageBodyDiv = messageTextDiv.querySelector('.message-body');
            if (messageBodyDiv) {
                 messageBodyDiv.insertAdjacentElement('afterend', imageContainer);
            } else {
                 // If no text body, append after sender name
                 const senderNameDiv = messageTextDiv.querySelector('.sender-name');
                 if (senderNameDiv) {
                     senderNameDiv.insertAdjacentElement('afterend', imageContainer);
                 } else {
                     // Fallback: append directly to message-text
                     messageTextDiv.appendChild(imageContainer);
                 }
            }
            // Update the innerHTML with the modified structure
            messageInnerHtml = tempContainer.innerHTML;
        }
    }

    messageElement.innerHTML = messageInnerHtml;

    // Highlight code blocks after appending to DOM (safer)
    // Use requestAnimationFrame for potentially better timing
    requestAnimationFrame(() => {
        messageElement.querySelectorAll('pre code').forEach((block) => {
            try {
                 hljs.highlightElement(block);
            } catch (err) {
                 console.error("Highlighting error:", err);
            }
        });
    });


    return messageElement;
}