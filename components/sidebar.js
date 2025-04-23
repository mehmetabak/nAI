// components/sidebar.js
import Swal from 'sweetalert2'; // SweetAlert2 import edildi

// --- Constants ---
const CHAT_LIST_KEY = 'chatHistoryList';
const ACTIVE_CHAT_ID_KEY = 'activeChatId';
const CHAT_HISTORY_PREFIX = 'chatHistory_';

// --- DOM Elements ---
let chatListElement;
let newChatButton;

// --- State ---
let chatList = [];
let activeChatId = null;

// --- Helper Functions ---

/**
 * Loads the chat list (metadata) from localStorage.
 * @returns {Array} The chat list.
 */
function loadChatList() {
    const storedList = localStorage.getItem(CHAT_LIST_KEY);
    return storedList ? JSON.parse(storedList) : [];
}

/**
 * Saves the chat list (metadata) to localStorage.
 * @param {Array} list The chat list to save.
 */
function saveChatList(list) {
    localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
}

/**
 * Loads the active chat ID from localStorage.
 * @returns {string | null} The active chat ID or null.
 */
function loadActiveChatId() {
    return localStorage.getItem(ACTIVE_CHAT_ID_KEY);
}

/**
 * Saves the active chat ID to localStorage.
 * @param {string | null} chatId The chat ID to save as active.
 */
function saveActiveChatId(chatId) {
    if (chatId) {
        localStorage.setItem(ACTIVE_CHAT_ID_KEY, chatId);
    } else {
        localStorage.removeItem(ACTIVE_CHAT_ID_KEY);
    }
}

/**
 * Generates a unique chat ID.
 * @returns {string} A unique ID string.
 */
function generateChatId() {
    return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Creates a new chat list item element.
 * @param {object} chat - The chat object { id, name }.
 * @param {function} onSelect - Callback function when the item is selected.
 * @param {function} onRename - Callback function when the rename action is triggered.
 * @param {function} onDelete - Callback function when the delete action is triggered.
 * @returns {HTMLElement} The list item element.
 */
function createChatListItem(chat, onSelect, onRename, onDelete) {
    const item = document.createElement('li');
    item.classList.add('chat-list-item');
    item.dataset.chatId = chat.id;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0'); // Make it focusable

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('chat-name');
    nameSpan.textContent = chat.name;
    nameSpan.title = chat.name; // Show full name on hover if truncated

    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('chat-actions');

    const renameButton = document.createElement('button');
    renameButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    renameButton.classList.add('chat-action-button');
    renameButton.title = 'Rename Chat';
    renameButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent item selection
        onRename(chat.id, nameSpan);
    });

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteButton.classList.add('chat-action-button');
    deleteButton.title = 'Delete Chat';
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent item selection
        onDelete(chat.id);
    });

    actionsDiv.appendChild(renameButton);
    actionsDiv.appendChild(deleteButton);

    item.appendChild(nameSpan);
    item.appendChild(actionsDiv);

    // Select chat on click or Enter key press
    item.addEventListener('click', () => onSelect(chat.id));
    item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            onSelect(chat.id);
        }
    });

    return item;
}

// --- Core Functions ---

/**
 * Renders the chat list in the sidebar.
 * @param {function} onSelect - Callback for when a chat is selected.
 * @param {function} onRename - Callback for renaming.
 * @param {function} onDelete - Callback for deleting.
 */
function renderSidebar(onSelect, onRename, onDelete) {
    if (!chatListElement) return;
    chatListElement.innerHTML = ''; // Clear existing list
    chatList.forEach(chat => {
        const item = createChatListItem(chat, onSelect, onRename, onDelete);
        if (chat.id === activeChatId) {
            item.classList.add('active');
            // Scroll into view if needed
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        chatListElement.appendChild(item);
    });
}

/**
 * Handles selecting a chat.
 * @param {string} chatId - The ID of the chat to select.
 * @param {function} loadChatCallback - Function from main.js to load chat messages.
 */
function selectChat(chatId, loadChatCallback) {
    if (chatId === activeChatId) return; // Already active

    // Save current active chat history (if any) before switching
    // This responsibility is moved to main.js's appendMessage

    activeChatId = chatId;
    saveActiveChatId(chatId);

    // Update UI
    const items = chatListElement.querySelectorAll('.chat-list-item');
    items.forEach(item => {
        item.classList.toggle('active', item.dataset.chatId === chatId);
        if (item.dataset.chatId === chatId) {
           item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    // Trigger loading the selected chat's messages in main.js
    loadChatCallback(chatId);
}

/**
 * Handles creating a new chat.
 * @param {function} loadChatCallback - Function from main.js to load chat messages.
 */
function createNewChat(loadChatCallback) {
    const newChatId = generateChatId();
    const newChatName = `Untitled Chat ${chatList.length + 1}`; // Or just "Untitled Chat"
    const newChat = { id: newChatId, name: newChatName };

    chatList.unshift(newChat); // Add to the beginning of the list
    saveChatList(chatList);

    // Clear history for the new chat in localStorage (important!)
    localStorage.removeItem(CHAT_HISTORY_PREFIX + newChatId);

    activeChatId = newChatId;
    saveActiveChatId(newChatId);

    renderSidebar(
        (id) => selectChat(id, loadChatCallback),
        handleRenameChat,
        (id) => handleDeleteChat(id, loadChatCallback)
    );

    // Trigger loading the (empty) new chat
    loadChatCallback(newChatId);
}

/**
 * Handles the rename action for a chat.
 * @param {string} chatId - The ID of the chat to rename.
 * @param {HTMLElement} nameSpan - The span element containing the chat name.
 */
function handleRenameChat(chatId, nameSpan) {
    const originalName = nameSpan.textContent;
    nameSpan.contentEditable = 'true';
    nameSpan.focus();
    nameSpan.style.cursor = 'text'; // Indicate editable
    nameSpan.style.backgroundColor = '#444'; // Visual feedback
    nameSpan.style.borderRadius = '4px';

    const finishEditing = () => {
        nameSpan.contentEditable = 'false';
        nameSpan.style.cursor = 'pointer';
        nameSpan.style.backgroundColor = 'transparent';
        const newName = nameSpan.textContent.trim();

        if (newName && newName !== originalName) {
            const chatIndex = chatList.findIndex(c => c.id === chatId);
            if (chatIndex !== -1) {
                chatList[chatIndex].name = newName;
                saveChatList(chatList);
                // No need to re-render, just update text content which is done
            }
        } else {
            nameSpan.textContent = originalName; // Revert if empty or unchanged
        }
         // Remove event listeners to prevent memory leaks
        nameSpan.removeEventListener('blur', finishEditing);
        nameSpan.removeEventListener('keydown', handleKeyDown);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent newline
            finishEditing();
        } else if (e.key === 'Escape') {
            nameSpan.textContent = originalName; // Revert on Escape
            finishEditing();
        }
    };

    nameSpan.addEventListener('blur', finishEditing);
    nameSpan.addEventListener('keydown', handleKeyDown);

     // Select all text in the span for easy editing
     const range = document.createRange();
     range.selectNodeContents(nameSpan);
     const selection = window.getSelection();
     selection.removeAllRanges();
     selection.addRange(range);
}

/**
 * Handles deleting a chat.
 * @param {string} chatId - The ID of the chat to delete.
 * @param {function} loadChatCallback - Function from main.js to load chat messages.
 */
function handleDeleteChat(chatId, loadChatCallback) {
    const chatToDelete = chatList.find(c => c.id === chatId);
    if (!chatToDelete) return;

    Swal.fire({
        title: 'Delete Chat?',
        text: `Are you sure you want to delete "${chatToDelete.name}"? This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        background: '#111', // Dark theme for SweetAlert
        color: '#ecf0f1'
    }).then((result) => {
        if (result.isConfirmed) {
            // Remove from chat list
            chatList = chatList.filter(c => c.id !== chatId);
            saveChatList(chatList);

            // Remove chat history from localStorage
            localStorage.removeItem(CHAT_HISTORY_PREFIX + chatId);

            // If the deleted chat was active, select another one or create a new one
            if (activeChatId === chatId) {
                activeChatId = null; // Reset active ID
                saveActiveChatId(null);
                if (chatList.length > 0) {
                    // Select the first chat in the list
                    selectChat(chatList[0].id, loadChatCallback);
                } else {
                    // No chats left, create a new one
                    createNewChat(loadChatCallback);
                    // Note: createNewChat already calls loadChatCallback
                    return; // Exit early as createNewChat handles the rest
                }
            }

            // Re-render the sidebar
             renderSidebar(
                (id) => selectChat(id, loadChatCallback),
                handleRenameChat,
                (id) => handleDeleteChat(id, loadChatCallback) // Pass delete handler again
            );

            // If the deleted chat wasn't active, we don't need to load anything new
            // But if it WAS active and we selected a new one above, loadChatCallback was already called by selectChat
            // So, no extra loadChatCallback needed here.
        }
    });
}


// --- Initialization ---

/**
 * Initializes the sidebar functionality.
 * @param {function} loadChatCallback - The function from main.js to load chat messages.
 */
export function initializeSidebar(loadChatCallback) {
    chatListElement = document.getElementById('chat-list');
    newChatButton = document.getElementById('new-chat-button');

    if (!chatListElement || !newChatButton) {
        console.error("Sidebar elements not found!");
        return;
    }

    chatList = loadChatList();
    activeChatId = loadActiveChatId();

    // Ensure there's always at least one chat
    if (chatList.length === 0) {
        console.log("No chat list found, creating initial chat.");
        const initialChatId = generateChatId();
        const initialChat = { id: initialChatId, name: 'First Chat' };
        chatList.push(initialChat);
        activeChatId = initialChatId;
        saveChatList(chatList);
        saveActiveChatId(activeChatId);
         // Make sure the history for this new chat is empty
        localStorage.removeItem(CHAT_HISTORY_PREFIX + initialChatId);
    }

    // Validate activeChatId - if it doesn't exist in the list, select the first one
    if (!activeChatId || !chatList.some(c => c.id === activeChatId)) {
        console.log("Invalid or missing active chat ID, selecting first chat.");
        activeChatId = chatList[0]?.id || null; // Use optional chaining
        saveActiveChatId(activeChatId);
    }

    // Add event listener for the "New Chat" button
    newChatButton.addEventListener('click', () => createNewChat(loadChatCallback));

    // Initial render
    renderSidebar(
        (id) => selectChat(id, loadChatCallback),
        handleRenameChat,
        (id) => handleDeleteChat(id, loadChatCallback)
    );

     // Make sidebar visible by adding class to body
    document.body.classList.add('sidebar-visible');

    // Load the initial active chat history (important!)
    if(activeChatId) {
        loadChatCallback(activeChatId);
    } else {
        console.warn("No active chat to load initially.");
        // Optionally clear the chat display area if needed
    }

    console.log("Sidebar initialized. Active chat:", activeChatId);
}

/**
 * Gets the current active chat ID.
 * @returns {string | null} The active chat ID.
 */
export function getActiveChatId() {
    return activeChatId;
}

/**
 * Loads the message history for a specific chat ID from localStorage.
 * @param {string} chatId - The ID of the chat.
 * @returns {Array} The message history array.
 */
export function loadChatHistory(chatId) {
    if (!chatId) return [];
    const history = localStorage.getItem(CHAT_HISTORY_PREFIX + chatId);
    try {
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error(`Error parsing chat history for ${chatId}:`, e);
        return []; // Return empty array on error
    }
}

/**
 * Saves the message history for a specific chat ID to localStorage.
 * @param {string} chatId - The ID of the chat.
 * @param {Array} history - The message history array to save.
 */
export function saveChatHistory(chatId, history) {
    if (!chatId) {
        console.warn("Attempted to save history with no chatId.");
        return;
    }
    try {
        localStorage.setItem(CHAT_HISTORY_PREFIX + chatId, JSON.stringify(history));
    } catch (e) {
         console.error(`Error saving chat history for ${chatId}:`, e);
         // Consider notifying the user if storage is full
         Swal.fire({
            title: 'Storage Error',
            text: 'Could not save chat history. Local storage might be full.',
            icon: 'error',
            background: '#111',
            color: '#ecf0f1'
         });
    }
}