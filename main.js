// Imports (keep existing)
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import Groq from 'groq-sdk';
import { createMessageElement } from './components/message.js'; // Assuming this exists

// --- Constants ---
const CHAT_HISTORY_KEY = 'nai_chat_history_v2'; // Use new key if format changes significantly
const CURRENT_CHAT_ID_KEY = 'nai_current_chat_id_v2';
const PREFERRED_MODEL_KEY = 'nai_preferred_model';
const SIDEBAR_COLLAPSED_KEY = 'nai_sidebar_collapsed'; // Remember sidebar state

// API Keys (keep existing)
const API_KEY_Gemini = import.meta.env.VITE_API_KEY_Gemini;
const API_KEY_Text_Bison = import.meta.env.VITE_API_KEY_Text_Bison;
const API_KEY_Llama = import.meta.env.VITE_API_KEY_Llama;

// --- UI Elements ---
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const newChatButton = document.getElementById('new-chat-button');
const chatHistoryList = document.getElementById('chat-history-list');
const mainContent = document.getElementById('main-content');
const topBar = document.getElementById('top-bar'); // Get top bar
const modelSelector = document.getElementById('model-selector');
const userInfo = document.getElementById('user-info');
const toggleMenuButton = document.getElementById('toggle-menu-button'); // Ellipsis button
const menuWindow = document.getElementById("menu-window"); // Pop-up menu
const chatMessages = document.getElementById("chat-messages");
const inputText = document.getElementById("input-text");
const sendButton = document.getElementById("send-button");
const chatActionPopover = document.getElementById('chat-action-popover'); // Action popover for history items
const userInputArea = document.getElementById('user-input'); // User input container

// Modal/Menu Buttons (keep existing references if modals are kept)
const menuWindowCloseButton = document.getElementById("menu-window-close"); // Might be removed visually
const modelSettingsButton = document.getElementById("settings-button");
const aboutButton = document.getElementById("about-button");
const changelogButton = document.getElementById("changelog-button");
const githubButton = document.getElementById("github-button");
const modelWindow = document.getElementById("model-window");
const modelWindowCloseButton = document.getElementById("model-window-close-button");
const aboutScreen = document.getElementById("about-screen");
const aboutScreenCloseButton = document.getElementById("about-screen-close-button");
const changelogScreen = document.getElementById("changelog-screen");
const changelogScreenCloseButton = document.getElementById("changelog-screen-close-button");

// --- State Variables ---
let conversationHistory = [];
let allChats = {}; // { chatId: { id, model, title, messages: [], createdAt: timestamp } }
let currentChatId = null;
let models = [];
let isSidebarCollapsed = false;
let activePopoverChatId = null; // Track which chat the popover is for

const originalSendButtonContent = sendButton.innerHTML; // Store original icon

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadModelsAndInitialize();
    loadAllChatsFromStorage();
    initializeSidebarState(); // Load sidebar collapsed state

    const lastChatId = localStorage.getItem(CURRENT_CHAT_ID_KEY);
    if (lastChatId && allChats[lastChatId]) {
        loadChat(lastChatId);
    } else {
        startNewChat();
    }

    renderChatHistoryList();
    adjustLayoutForSidebar(); // Initial layout adjustment
    setupEventListeners(); // Centralize event listener setup
});

// --- Core Functions ---

async function loadModelsAndInitialize() {
    try {
        const response = await fetch('/models.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        models = await response.json();
        populateModelSelector(models);
        initializeModelSelection();
    } catch (error) {
        console.error("Failed to load models:", error);
        showError("Could not load AI models. Please refresh.");
    }
}

function loadAllChatsFromStorage() {
    const storedChats = localStorage.getItem(CHAT_HISTORY_KEY);
    allChats = storedChats ? JSON.parse(storedChats) : {};
    // Simple migration if old format detected (optional)
}

function saveAllChatsToStorage() {
    try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(allChats));
    } catch (e) {
        console.error("Error saving chats to localStorage:", e);
        showError("Could not save chat history. Storage might be full.");
    }
}

function startNewChat() {
    const newChatId = `chat_${Date.now()}`;
    const preferredModel = localStorage.getItem(PREFERRED_MODEL_KEY) || (models.length > 0 ? models[0].name : 'default');
    const modelLabel = getModelLabel(preferredModel);

    currentChatId = newChatId;
    conversationHistory = [];
    allChats[currentChatId] = {
        id: currentChatId,
        model: preferredModel,
        title: "New Chat",
        messages: [],
        createdAt: Date.now() // Store creation time
    };

    localStorage.setItem(CURRENT_CHAT_ID_KEY, currentChatId);
    saveAllChatsToStorage();
    renderChatHistoryList(); // Update sidebar
    clearChatMessagesUI();
    // updateChatHeader(modelLabel); // Header removed, model in top bar
    inputText.value = "";
    inputText.focus();
    console.log("Started new chat:", currentChatId, "with model:", preferredModel);
}

function loadChat(chatId) {
    if (!allChats[chatId]) {
        console.warn(`Chat with ID ${chatId} not found. Starting new chat.`);
        startNewChat();
        return;
    }

    currentChatId = chatId;
    const chatData = allChats[chatId];
    conversationHistory = chatData.messages || [];
    localStorage.setItem(CURRENT_CHAT_ID_KEY, currentChatId);

    clearChatMessagesUI();
    const modelData = models.find(m => m.name === chatData.model);
    const modelLabel = modelData?.label || 'nAI';
    const defaultAIPP = modelData?.AIPP || 'DEFAULT_AI_ICON_URL'; // Replace with actual default

    conversationHistory.forEach(msg => {
        const isAI = msg.role !== 'user';
        appendMessageUI(isAI ? modelLabel : "User", msg.content, isAI, isAI ? defaultAIPP : null);
    });

    renderChatHistoryList(); // Highlight active chat
    // updateChatHeader(modelLabel); // Header removed
    console.log("Loaded chat:", currentChatId);
}

function deleteChat(chatId) {
    if (!allChats[chatId]) return;
    const chatTitle = allChats[chatId].title;

    // Confirmation (using SweetAlert2 if available, else confirm)
    const confirmDelete = window.Sweetalert2 ? Swal.fire({
        title: 'Delete Chat?',
        text: `Are you sure you want to delete "${chatTitle}"? This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
      }) : Promise.resolve(confirm(`Delete "${chatTitle}"?`));

    confirmDelete.then((result) => {
        // Check result.isConfirmed for Swal, or boolean for confirm
        if (result === true || (result && result.isConfirmed)) {
            delete allChats[chatId];
            saveAllChatsToStorage();

            if (currentChatId === chatId) {
                const remainingChatIds = Object.keys(allChats).sort((a, b) => allChats[b].createdAt - allChats[a].createdAt); // Sort by newest
                if (remainingChatIds.length > 0) {
                    loadChat(remainingChatIds[0]);
                } else {
                    startNewChat();
                }
            } else {
                renderChatHistoryList(); // Just update the list
            }
            hidePopover(); // Close popover after action
            console.log("Deleted chat:", chatId);
         }
    });


}

function renameChat(chatId) {
     if (!allChats[chatId]) return;
     const currentTitle = allChats[chatId].title;

     // Prompt for new name (using SweetAlert2 if available)
     const promptRename = window.Sweetalert2 ? Swal.fire({
         title: 'Rename Chat',
         input: 'text',
         inputValue: currentTitle,
         showCancelButton: true,
         confirmButtonText: 'Rename',
         inputValidator: (value) => {
             if (!value || value.trim().length === 0) {
                 return 'Please enter a name!'
             }
         }
     }) : Promise.resolve(prompt("Enter new name for the chat:", currentTitle));


     promptRename.then(result => {
        // Check result.value for Swal, or string/null for prompt
        const newTitle = result ? (result.value || result) : null;
         if (newTitle && newTitle.trim() !== "" && newTitle !== currentTitle) {
             allChats[chatId].title = newTitle.trim();
             saveAllChatsToStorage();
             renderChatHistoryList(); // Update list display
             hidePopover(); // Close popover
             console.log("Renamed chat:", chatId, "to:", newTitle);
         } else if (newTitle === null) {
             // User cancelled
             hidePopover();
         }
     });
}

function shareChat(chatId) {
    if (!allChats[chatId]) return;
    const chat = allChats[chatId];
    const modelLabel = getModelLabel(chat.model);
    let markdownContent = `# Chat: ${chat.title}\n\n**Model:** ${modelLabel}\n**Date:** ${new Date(chat.createdAt).toLocaleString()}\n\n---\n\n`;

    chat.messages.forEach(msg => {
        const prefix = msg.role === 'user' ? '**User:**' : `**${modelLabel}:**`;
        markdownContent += `${prefix}\n${msg.content}\n\n---\n\n`;
    });

    // Create a blob and download link
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Sanitize title for filename
    const safeTitle = chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `nai_chat_${safeTitle}.md`;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
    hidePopover();
    console.log("Shared chat as Markdown:", chatId);
}

function printChat(chatId) {
    if (!allChats[chatId]) return;

    // Temporarily load the chat to print, then restore the original view
    const originalChatId = currentChatId;
    loadChat(chatId); // Load the chat content into the main view

    // Optional: Add a title or header for printing
    const printTitle = document.createElement('h1');
    printTitle.textContent = `Chat: ${allChats[chatId].title}`;
    printTitle.style.textAlign = 'center';
    printTitle.style.marginBottom = '20px';
    chatMessages.insertAdjacentElement('beforebegin', printTitle); // Add title before messages

    // Hide elements not needed for printing
    sidebar.style.display = 'none';
    topBar.style.display = 'none';
    userInputArea.style.display = 'none';
    mainContent.style.marginLeft = '0'; // Ensure full width

    window.print(); // Trigger browser print dialog (can save as PDF)

    // Restore original view after print dialog closes (or after a short delay)
    setTimeout(() => {
        sidebar.style.display = 'flex'; // Or original display value
        topBar.style.display = 'flex';
        userInputArea.style.display = 'flex';
        printTitle.remove(); // Remove the temporary title
        adjustLayoutForSidebar(); // Re-apply layout adjustments
        loadChat(originalChatId); // Load back the originally active chat
        hidePopover();
    }, 500); // Delay might need adjustment
}

// --- UI & Layout Functions ---

function renderChatHistoryList() {
    chatHistoryList.innerHTML = ''; // Clear list
    hidePopover(); // Hide popover when list re-renders

    // Sort chats by creation date, newest first
    const sortedChatIds = Object.keys(allChats).sort((a, b) => (allChats[b].createdAt || 0) - (allChats[a].createdAt || 0));

    sortedChatIds.forEach(chatId => {
        const chat = allChats[chatId];
        if (!chat) return;

        const listItem = document.createElement('li');
        listItem.dataset.chatId = chatId;
        listItem.title = chat.title; // Tooltip for full title

        // Title Span
        const titleSpan = document.createElement('span');
        titleSpan.className = 'chat-title';
        titleSpan.textContent = chat.title || `Chat ${chatId}`;
        listItem.appendChild(titleSpan);

        // Actions Button (ellipsis)
        const actionsButton = document.createElement('span');
        actionsButton.className = 'chat-actions';
        actionsButton.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
        actionsButton.title = 'Chat Actions';
        actionsButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent li click
            showPopover(event.currentTarget, chatId);
        });
        listItem.appendChild(actionsButton);


        if (chatId === currentChatId) {
            listItem.classList.add('active-chat');
        }

        // Click on list item loads the chat
        listItem.addEventListener('click', () => {
            if (currentChatId !== chatId) {
                loadChat(chatId);
            }
            // Optionally close sidebar on mobile after selection
             if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
                 toggleSidebar();
             }
        });

        chatHistoryList.appendChild(listItem);
    });
}

function clearChatMessagesUI() {
    chatMessages.innerHTML = '';
}

// Appends a message visually to the chat window
function appendMessageUI(sender, message, isAI, profilePicUrl = null) {
    const aiProfilePic = profilePicUrl || models.find(m => m.label === sender)?.AIPP || 'DEFAULT_AI_ICON_URL'; // Get AIPP
    const messageElement = createMessageElement(sender, message, isAI, isAI ? aiProfilePic : null); // Pass AIPP
    chatMessages.appendChild(messageElement);
    // Scroll to bottom smoothly
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

// Adds message to UI, state, and saves
function appendAndSaveMessage(senderLabel, message, isAI) {
    if (!currentChatId || !allChats[currentChatId]) {
        console.error("Cannot append message: No active chat.");
        showError("No active chat selected. Please start a new chat.");
        return;
    }
    const currentModelData = models.find(m => m.name === allChats[currentChatId].model);
    const profilePic = isAI ? (currentModelData?.AIPP /* || defaultAIPP */) : null;

    appendMessageUI(senderLabel, message, isAI, profilePic);

    const messageData = { role: isAI ? "assistant" : "user", content: message };
    conversationHistory.push(messageData);
    allChats[currentChatId].messages.push(messageData);

    // Update title on first user message
    if (allChats[currentChatId].messages.length === 1 && !isAI) {
        const newTitle = message.substring(0, 40) + (message.length > 40 ? '...' : '');
        allChats[currentChatId].title = newTitle;
        renderChatHistoryList(); // Update sidebar title
    }

    saveAllChatsToStorage();
}

// Handles sending message logic
async function handleSendMessage() {
    const userMessage = inputText.value.trim();
    if (userMessage === "" || sendButton.disabled) return;

    if (!currentChatId || !allChats[currentChatId]) {
        console.warn("No current chat, starting new one before sending message.");
        startNewChat();
        // Need a slight delay or re-architecture if startNewChat is fully async
        // For now, assume startNewChat sets up the necessary state synchronously
         if (!currentChatId || !allChats[currentChatId]) {
              showError("Failed to start a new chat. Please try again.");
              return;
         }
    }

    const currentModelName = allChats[currentChatId].model;
    const selectedModelData = models.find(m => m.name === currentModelName);

    if (!selectedModelData) {
        showError(`Model configuration for '${currentModelName}' not found.`);
        return;
    }

    showLoadingDots(sendButton);
    inputText.value = ""; // Clear input immediately

    // Append user message
    appendAndSaveMessage("User", userMessage, false);

    // Generate AI response
    try {
        await generateResponse(selectedModelData, userMessage); // Pass userMessage explicitly
    } catch (error) {
         console.error("Error during generateResponse call:", error);
         // Error is usually appended within generateResponse, but add fallback
         // appendAndSaveMessage("System", `Error: ${error.message}`, true);
    } finally {
        hideLoadingDots(sendButton);
        inputText.focus();
    }
}


// Toggles sidebar visibility
function toggleSidebar() {
    isSidebarCollapsed = !isSidebarCollapsed;
    sidebar.classList.toggle('collapsed', isSidebarCollapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isSidebarCollapsed);
    adjustLayoutForSidebar();
}

// Adjusts main content margin based on sidebar state
function adjustLayoutForSidebar() {
    const sidebarCurrentWidth = sidebar.classList.contains('collapsed') ? 0 : sidebar.offsetWidth;
    // Adjust main content margin only if sidebar is not absolutely positioned (desktop view)
    if (window.getComputedStyle(sidebar).position !== 'absolute') {
       mainContent.style.marginLeft = `${sidebarCurrentWidth}px`;
    } else {
       mainContent.style.marginLeft = '0px'; // No margin needed if sidebar overlays
    }
    // Adjust input area width (might not be needed if main-content handles width correctly)
    // userInputArea.style.width = `calc(100% - ${sidebarCurrentWidth}px)`;
    // userInputArea.style.left = `${sidebarCurrentWidth}px`;
}


// Load initial sidebar state from localStorage
function initializeSidebarState() {
    isSidebarCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    sidebar.classList.toggle('collapsed', isSidebarCollapsed);
    // No need to call adjustLayout yet, DOMContentLoaded handles initial layout
}

// --- Popover Functions ---
function showPopover(targetElement, chatId) {
    activePopoverChatId = chatId; // Store the chat ID for actions
    const rect = targetElement.getBoundingClientRect();

    // Position near the target element (ellipsis icon)
    chatActionPopover.style.top = `${rect.bottom + window.scrollY + 5}px`; // Below the icon
    chatActionPopover.style.left = `${rect.left + window.scrollX - chatActionPopover.offsetWidth + rect.width}px`; // Align right edge
    chatActionPopover.style.display = 'block';

    // Add a listener to close the popover when clicking outside
     setTimeout(() => { // Use timeout to avoid immediate closing
         document.addEventListener('click', handleClickOutsidePopover, { capture: true, once: true });
     }, 0);
}

function hidePopover() {
    activePopoverChatId = null;
    chatActionPopover.style.display = 'none';
    document.removeEventListener('click', handleClickOutsidePopover, { capture: true }); // Clean up listener
}

function handleClickOutsidePopover(event) {
    // If the click is outside the popover and not on an actions button
    if (!chatActionPopover.contains(event.target) && !event.target.closest('.chat-actions')) {
        hidePopover();
    } else {
         // Re-attach listener if click was inside popover but didn't close it
         // This happens if an action doesn't immediately close it
         document.addEventListener('click', handleClickOutsidePopover, { capture: true, once: true });
    }
}

// Handle clicks within the popover
function handlePopoverAction(event) {
    const button = event.target.closest('button');
    if (!button || !activePopoverChatId) return;

    const action = button.dataset.action;

    switch (action) {
        case 'rename':
            renameChat(activePopoverChatId);
            break;
        case 'share':
            shareChat(activePopoverChatId);
            break;
        case 'print':
             printChat(activePopoverChatId);
             break;
        case 'delete':
            deleteChat(activePopoverChatId);
            break;
        default:
            console.warn("Unknown popover action:", action);
            hidePopover(); // Hide if action is unknown
    }
    // Most actions will hide the popover within their own logic,
    // but hide it here as a fallback if needed.
    // hidePopover();
}


// --- Event Listener Setup ---
function setupEventListeners() {
    sidebarToggle.addEventListener('click', toggleSidebar);
    newChatButton.addEventListener('click', startNewChat);
    modelSelector.addEventListener('change', handleModelSelectionChange);
    sendButton.addEventListener('click', handleSendMessage);
    inputText.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });

    // Top right menu toggle
    toggleMenuButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent body click listener closing it immediately
        menuWindow.classList.toggle('opened');
        // Add listener to close menu when clicking outside
         if (menuWindow.classList.contains('opened')) {
             document.addEventListener('click', handleOutsideMenuClick, { capture: true, once: true });
         }
    });

    // Popover action delegation
    chatActionPopover.addEventListener('click', handlePopoverAction);


    // Window resize listener to adjust layout
    window.addEventListener('resize', adjustLayoutForSidebar);

    // Modal window buttons (if modals are kept)
    setupModalButtonListeners();
}

// Close top-right menu if clicked outside
function handleOutsideMenuClick(event) {
    if (!menuWindow.contains(event.target) && !toggleMenuButton.contains(event.target)) {
        menuWindow.classList.remove('opened');
    } else if (menuWindow.classList.contains('opened')) {
        // Re-attach listener if click was inside
        document.addEventListener('click', handleOutsideMenuClick, { capture: true, once: true });
    }
}

// Setup for existing modal windows (About, Changelog, etc.)
function setupModalButtonListeners() {
    aboutButton.onclick = () => { menuWindow.classList.remove('opened'); aboutScreen.classList.add('opened'); };
    aboutScreenCloseButton.onclick = () => aboutScreen.classList.remove('opened');

    changelogButton.onclick = () => { menuWindow.classList.remove('opened'); changelogScreen.classList.add('opened'); };
    changelogScreenCloseButton.onclick = () => changelogScreen.classList.remove('opened');

    githubButton.onclick = () => { menuWindow.classList.remove('opened'); window.open('https://github.com/mehmetabak/nAI', '_blank'); };

    // Settings button might open the less relevant modelWindow now
    settingsButton.onclick = () => { menuWindow.classList.remove('opened'); modelWindow.classList.add('opened'); };
    modelWindowCloseButton.onclick = () => modelWindow.classList.remove('opened');

     // Close modals on Escape key
     document.addEventListener('keydown', (event) => {
         if (event.key === 'Escape') {
             document.querySelectorAll('.modal-window.opened').forEach(modal => modal.classList.remove('opened'));
             menuWindow.classList.remove('opened');
             hidePopover();
         }
     });
}


// --- Model & Generation Functions (Minor Updates) ---

function initializeModelSelection() {
    const preferredModel = localStorage.getItem(PREFERRED_MODEL_KEY);
    if (preferredModel && models.some(m => m.name === preferredModel)) {
        modelSelector.value = preferredModel;
    } else if (models.length > 0) {
        modelSelector.value = models[0].name;
        localStorage.setItem(PREFERRED_MODEL_KEY, models[0].name);
    }
}

function populateModelSelector(modelsToPopulate) {
    modelSelector.innerHTML = '';
    modelsToPopulate.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.text = model.label; // Display label
        modelSelector.appendChild(option);
    });
}

// Model selection only affects *new* chats
function handleModelSelectionChange() {
    const selectedModel = modelSelector.value;
    localStorage.setItem(PREFERRED_MODEL_KEY, selectedModel);
    // Optional: Notify user
    // showNotification(`'${getModelLabel(selectedModel)}' will be used for new chats.`);
}

function getModelLabel(modelName) {
    const model = models.find(m => m.name === modelName);
    return model ? model.label : 'nAI'; // Fallback label
}

// Main function to generate AI response (Pass userMessage explicitly)
async function generateResponse(model, userMessage) {
    const currentChat = allChats[currentChatId];
    if (!currentChat) throw new Error("Active chat not found during generation");

    // Prepare history (limit size if necessary)
    const historyForAPI = conversationHistory.slice(-20).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role, // Adjust role for Gemini
        parts: [{ text: msg.content }]
    }));

    // Date and q/a (less critical if using full history)
    const date = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDate = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} - ${days[date.getDay()]}`;
    let q = historyForAPI.length > 1 ? historyForAPI[historyForAPI.length - 2]?.parts[0]?.text : "";
    let a = historyForAPI.length > 0 ? historyForAPI[historyForAPI.length - 1]?.parts[0]?.text : "";


    try {
        let aiResponseText = "Error: Model response generation failed."; // Default error

        // --- API Call Logic (largely unchanged, ensure model data access is correct) ---
        if (model.api_key === "API_KEY_Text_Bison") {
            // ... Bison call using model.* config ...
             const response = await fetch(/* ... Bison URL ... */);
             if (!response.ok) throw new Error(`Bison API Error: ${response.statusText}`);
             const data = await response.json();
             aiResponseText = data.candidates[0].output;

        } else if (model.api_key === "API_KEY_Gemini") {
            // ... Gemini non-chat call using model.* config ...
             const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
             const modelInstance = genAI.getGenerativeModel({ model: model.model_name });
             // Prepare parts, config, safety settings from model object
             const result = await modelInstance.generateContent({ /* ... */ });
             aiResponseText = result.response.text();

        } else if(model.api_key === "API_KEY_G/C"){
            // ... Gemini Chat call using model.* config and history ...
             const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
             const modelInstance = genAI.getGenerativeModel({ /* ... systemInstruction ... */ });
             const chatSession = modelInstance.startChat({ /* ... history: historyForAPI ... */});
             const result = await chatSession.sendMessage(userMessage); // Pass current message
             aiResponseText = result.response.text();

        } else if(model.api_key === "API_KEY_Llama"){
            // ... Llama (Groq) call using model.* config and history ...
             const groq = new Groq({ apiKey: API_KEY_Llama, dangerouslyAllowBrowser: true });
             const messagesForGroq = [ /* system prompt */, ...conversationHistory.map(m => ({ role: m.role, content: m.content }))];
             const chatCompletion = await groq.chat.completions.create({ messages: messagesForGroq, model: model.model_name, /* ... other config ... */ });
             aiResponseText = chatCompletion.choices[0]?.message?.content || "Llama response error.";
        } else {
             throw new Error(`Unsupported API key type specified in model config: ${model.api_key}`);
        }

        // Append successful response
        appendAndSaveMessage(model.label, aiResponseText, true);

    } catch (error) {
        console.error("Error generating response:", error);
        // Append error message to the chat
        appendAndSaveMessage("System", `Error: ${error.message || "Failed to get response from model."}`, true);
    }
}


// --- Utility Functions ---

function showLoadingDots(button) {
    button.disabled = true;
    button.innerHTML = '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>'; // Simple CSS dots can be added
    button.classList.add('loading'); // Add class if CSS depends on it
}

function hideLoadingDots(button) {
    button.disabled = false;
    button.innerHTML = originalSendButtonContent; // Restore original icon/text
    button.classList.remove('loading');
}

// Basic error display (replace with toastr or SweetAlert if preferred)
function showError(message) {
    // Using SweetAlert if available
    if (window.Swal) {
         Swal.fire({
           icon: 'error',
           title: 'Oops...',
           text: message,
         });
    } else {
        alert(`Error: ${message}`); // Fallback
    }
}

// --- Add CSS for loading dots if needed ---
/*
.loading-dots span { animation: blink 1.4s infinite both; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }
*/