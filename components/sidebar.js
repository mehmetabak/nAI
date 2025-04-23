// components/sidebar.js
import Swal from 'sweetalert2';

// --- Constants ---
const CHAT_LIST_KEY = 'chatHistoryList';
const ACTIVE_CHAT_ID_KEY = 'activeChatId';
const CHAT_HISTORY_PREFIX = 'chatHistory_';
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsedDesktop';

// --- DOM Elements ---
let chatListElement;
let newChatButton;
let sidebarElement; // Sidebar'ın kendisi
let sidebarToggleDesktopButton;
let sidebarToggleMobileButton;
let mainContentElement; // Kaydırma için
let userInputElement; // Kaydırma için
let bodyElement; // Class eklemek için
let overlayElement; // Mobil için

// --- State ---
let chatList = [];
let activeChatId = null;
let isDesktopSidebarCollapsed = false;
let isMobileSidebarVisible = false;

// --- Helper Functions ---

function loadChatList() {
    const storedList = localStorage.getItem(CHAT_LIST_KEY);
    return storedList ? JSON.parse(storedList) : [];
}

function saveChatList(list) {
    localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
}

function loadActiveChatId() {
    return localStorage.getItem(ACTIVE_CHAT_ID_KEY);
}

function saveActiveChatId(chatId) {
    if (chatId) {
        localStorage.setItem(ACTIVE_CHAT_ID_KEY, chatId);
    } else {
        localStorage.removeItem(ACTIVE_CHAT_ID_KEY);
    }
}

function generateChatId() {
    return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function createChatListItem(chat, onSelect, onRename, onDelete) {
    const item = document.createElement('li');
    item.classList.add('chat-list-item');
    item.dataset.chatId = chat.id;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('chat-name');
    nameSpan.textContent = chat.name;
    nameSpan.title = chat.name;

    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('chat-actions');

    const renameButton = document.createElement('button');
    renameButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    renameButton.classList.add('chat-action-button');
    renameButton.title = 'Rename Chat';
    renameButton.addEventListener('click', (e) => {
        e.stopPropagation();
        onRename(chat.id, nameSpan);
    });

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteButton.classList.add('chat-action-button');
    deleteButton.title = 'Delete Chat';
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        onDelete(chat.id);
    });

    actionsDiv.appendChild(renameButton);
    actionsDiv.appendChild(deleteButton);

    item.appendChild(nameSpan);
    item.appendChild(actionsDiv);

    item.addEventListener('click', () => onSelect(chat.id));
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSelect(chat.id); });

    return item;
}

// --- Sidebar State Management ---

function loadSidebarState() {
    const collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    isDesktopSidebarCollapsed = collapsed === 'true';
    applySidebarState(); // Apply initial state
}

function saveSidebarState() {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isDesktopSidebarCollapsed);
}

function applySidebarState() {
    if (!bodyElement) return; // Ensure bodyElement is defined

    // Desktop state
    if (isDesktopSidebarCollapsed) {
        bodyElement.classList.add('sidebar-collapsed-desktop');
    } else {
        bodyElement.classList.remove('sidebar-collapsed-desktop');
    }

    // Mobile state (handled by a different class)
    if (isMobileSidebarVisible) {
         bodyElement.classList.add('sidebar-visible-mobile');
    } else {
         bodyElement.classList.remove('sidebar-visible-mobile');
    }
}

function toggleDesktopSidebar() {
    isDesktopSidebarCollapsed = !isDesktopSidebarCollapsed;
    saveSidebarState();
    applySidebarState();
}

function toggleMobileSidebar() {
    isMobileSidebarVisible = !isMobileSidebarVisible;
     // Mobile state does not need to be saved in localStorage (usually temporary)
    applySidebarState();
}

// --- Core Functions ---

function renderSidebar(onSelect, onRename, onDelete) {
    if (!chatListElement) return;
    chatListElement.innerHTML = '';
    chatList.forEach(chat => {
        const item = createChatListItem(chat, onSelect, onRename, onDelete);
        if (chat.id === activeChatId) {
            item.classList.add('active');
            // Only scroll if the sidebar is visible/expanded
            if (!isDesktopSidebarCollapsed || isMobileSidebarVisible) {
               item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
        chatListElement.appendChild(item);
    });
}

function selectChat(chatId, loadChatCallback) {
    if (chatId === activeChatId) {
         // If mobile sidebar is open, close it after selection
         if(isMobileSidebarVisible) {
             toggleMobileSidebar();
         }
        return; // Already active
    }

    activeChatId = chatId;
    saveActiveChatId(chatId);

    // Update UI selection highlight
    const items = chatListElement?.querySelectorAll('.chat-list-item');
    items?.forEach(item => {
        item.classList.toggle('active', item.dataset.chatId === chatId);
         if (item.classList.contains('active') && (!isDesktopSidebarCollapsed || isMobileSidebarVisible)) {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    // Load chat data
    loadChatCallback(chatId);

    // If mobile sidebar is open, close it after selection
    if(isMobileSidebarVisible) {
        toggleMobileSidebar();
    }
}

function createNewChat(loadChatCallback) {
    const newChatId = generateChatId();
    const newChatName = `Chat ${chatList.length + 1}`;
    const newChat = { id: newChatId, name: newChatName };

    chatList.unshift(newChat);
    saveChatList(chatList);
    localStorage.removeItem(CHAT_HISTORY_PREFIX + newChatId); // Clear history

    activeChatId = newChatId; // Set as active *before* rendering
    saveActiveChatId(newChatId);

    renderSidebar(
        (id) => selectChat(id, loadChatCallback),
        handleRenameChat,
        (id) => handleDeleteChat(id, loadChatCallback)
    );

    loadChatCallback(newChatId); // Load the new empty chat

    // If mobile sidebar is open, close it after creating
    if(isMobileSidebarVisible) {
        toggleMobileSidebar();
    }
    // If desktop sidebar was collapsed, expand it maybe? (Optional)
    // if(isDesktopSidebarCollapsed) {
    //     toggleDesktopSidebar();
    // }
}

function handleRenameChat(chatId, nameSpan) {
    const originalName = nameSpan.textContent;
    // Make editable directly
    nameSpan.contentEditable = 'true';
    nameSpan.focus();
    nameSpan.style.cursor = 'text';
    nameSpan.style.backgroundColor = '#444';
    nameSpan.style.borderRadius = '4px';
    nameSpan.style.padding = '1px 3px'; // Padding for better visual editing

    // Select text
    const range = document.createRange();
    range.selectNodeContents(nameSpan);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const finishEditing = () => {
        nameSpan.removeEventListener('blur', finishEditing);
        nameSpan.removeEventListener('keydown', handleKeyDown);
        nameSpan.contentEditable = 'false';
        nameSpan.style.cursor = 'pointer';
        nameSpan.style.backgroundColor = 'transparent';
         nameSpan.style.padding = '2px'; // Reset padding

        const newName = nameSpan.textContent.trim();

        if (newName && newName !== originalName) {
            const chatIndex = chatList.findIndex(c => c.id === chatId);
            if (chatIndex !== -1) {
                chatList[chatIndex].name = newName;
                saveChatList(chatList);
                nameSpan.title = newName; // Update tooltip
            }
        } else {
            nameSpan.textContent = originalName; // Revert
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            nameSpan.textContent = originalName; // Revert on Escape
            finishEditing();
        }
    };

    nameSpan.addEventListener('blur', finishEditing);
    nameSpan.addEventListener('keydown', handleKeyDown);
}

function handleDeleteChat(chatId, loadChatCallback) {
    const chatToDelete = chatList.find(c => c.id === chatId);
    if (!chatToDelete) return;

    Swal.fire({
        title: 'Delete Chat?',
        text: `Delete "${chatToDelete.name}"? This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c', // Red
        cancelButtonColor: '#3498db', // Blue
        confirmButtonText: 'Yes, delete it!',
        background: '#2c2c2c', // Darker background
        color: '#ecf0f1', // Light text
        customClass: { // Ensure button text is visible
             confirmButton: 'swal-button-confirm',
             cancelButton: 'swal-button-cancel'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            chatList = chatList.filter(c => c.id !== chatId);
            saveChatList(chatList);
            localStorage.removeItem(CHAT_HISTORY_PREFIX + chatId);

            let nextChatId = null;
            if (activeChatId === chatId) {
                 activeChatId = null; // Reset active ID
                 saveActiveChatId(null);
                 if (chatList.length > 0) {
                    nextChatId = chatList[0].id; // Select the first available
                 } else {
                    // No chats left, create new one
                    createNewChat(loadChatCallback);
                    return; // createNewChat handles rendering and loading
                 }
            }

             // Re-render sidebar *before* potentially selecting a new chat
             renderSidebar(
                (id) => selectChat(id, loadChatCallback),
                handleRenameChat,
                (id) => handleDeleteChat(id, loadChatCallback)
             );

            // If we determined a next chat to select, do it now
             if (nextChatId) {
                selectChat(nextChatId, loadChatCallback);
             }
        }
    });
}

// --- Initialization ---

export function initializeSidebar(loadChatCallback) {
    // Get DOM elements
    chatListElement = document.getElementById('chat-list');
    newChatButton = document.getElementById('new-chat-button');
    sidebarElement = document.getElementById('sidebar');
    sidebarToggleDesktopButton = document.getElementById('sidebar-toggle-desktop');
    sidebarToggleMobileButton = document.getElementById('sidebar-toggle-mobile');
    mainContentElement = document.getElementById('main-content');
    userInputElement = document.getElementById('user-input');
    bodyElement = document.body;

    // Create overlay dynamically for mobile backdrop
    overlayElement = document.createElement('div');
    overlayElement.id = 'mobile-sidebar-overlay';
    overlayElement.style.position = 'fixed';
    overlayElement.style.top = '0';
    overlayElement.style.left = '0';
    overlayElement.style.width = '100%';
    overlayElement.style.height = '100%';
    overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlayElement.style.zIndex = '1000'; // Below sidebar
    overlayElement.style.opacity = '0';
    overlayElement.style.transition = 'opacity var(--transition-speed) ease';
    overlayElement.style.pointerEvents = 'none';
    bodyElement.appendChild(overlayElement);


    if (!chatListElement || !newChatButton || !sidebarElement || !sidebarToggleDesktopButton || !sidebarToggleMobileButton || !bodyElement ) {
        console.error("Sidebar critical elements not found!");
        return;
    }

    chatList = loadChatList();
    activeChatId = loadActiveChatId();

    // Ensure there's always a chat
    if (chatList.length === 0) {
        const initialChatId = generateChatId();
        chatList.push({ id: initialChatId, name: 'First Chat' });
        activeChatId = initialChatId;
        saveChatList(chatList);
        saveActiveChatId(activeChatId);
        localStorage.removeItem(CHAT_HISTORY_PREFIX + initialChatId);
    }

    // Validate activeChatId
    if (!activeChatId || !chatList.some(c => c.id === activeChatId)) {
        activeChatId = chatList[0]?.id || null;
        saveActiveChatId(activeChatId);
    }

    // Load and apply sidebar collapsed state (desktop)
    loadSidebarState();

    // Add event listeners
    newChatButton.addEventListener('click', () => createNewChat(loadChatCallback));
    sidebarToggleDesktopButton.addEventListener('click', toggleDesktopSidebar);
    sidebarToggleMobileButton.addEventListener('click', toggleMobileSidebar);

    // Add listener to overlay to close mobile sidebar when clicking outside
     overlayElement.addEventListener('click', () => {
        if (isMobileSidebarVisible) {
            toggleMobileSidebar();
        }
     });


    // Initial render
    renderSidebar(
        (id) => selectChat(id, loadChatCallback),
        handleRenameChat,
        (id) => handleDeleteChat(id, loadChatCallback)
    );

    // Load the initial active chat history
    if(activeChatId) {
        loadChatCallback(activeChatId);
    } else {
        console.warn("No active chat to load initially.");
        // Optionally clear chat display
    }

    console.log("Sidebar initialized. Active chat:", activeChatId);
}

// --- Exported utility functions ---

export function getActiveChatId() {
    return activeChatId;
}

export function loadChatHistory(chatId) {
    if (!chatId) return [];
    const history = localStorage.getItem(CHAT_HISTORY_PREFIX + chatId);
    try {
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error(`Error parsing chat history for ${chatId}:`, e);
        // Optionally delete corrupted history
        // localStorage.removeItem(CHAT_HISTORY_PREFIX + chatId);
        return [];
    }
}

export function saveChatHistory(chatId, history) {
    if (!chatId) {
        console.warn("Attempted to save history with no chatId.");
        return;
    }
    try {
        localStorage.setItem(CHAT_HISTORY_PREFIX + chatId, JSON.stringify(history));
    } catch (e) {
         console.error(`Error saving chat history for ${chatId}:`, e);
         Swal.fire({ // Notify user about potential storage issue
            title: 'Storage Error',
            text: 'Could not save chat history. Local storage might be full or corrupted.',
            icon: 'error',
            background: '#2c2c2c',
            color: '#ecf0f1'
         });
    }
}