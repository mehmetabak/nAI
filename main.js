// Imports (Assuming these exist and work)
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import Groq from 'groq-sdk';
// import { showNotification } from './tools/notification'; // If using notifications
import { createMessageElement } from './components/message.js'; // CRITICAL: Ensure this function exists and works

// --- Constants ---
const CHAT_HISTORY_KEY = 'nai_chat_history_v3'; // Increment version if format changes
const CURRENT_CHAT_ID_KEY = 'nai_current_chat_id_v3';
const PREFERRED_MODEL_KEY = 'nai_preferred_model';
const SIDEBAR_COLLAPSED_KEY = 'nai_sidebar_collapsed';
const DEFAULT_AIPP = "https://static-00.iconduck.com/assets.00/ai-human-icon-256x256-j1bia0vl.png"; // Default AI Pic

// --- API Keys ---
const API_KEY_Gemini = import.meta.env.VITE_API_KEY_Gemini;
const API_KEY_Text_Bison = import.meta.env.VITE_API_KEY_Text_Bison;
const API_KEY_Llama = import.meta.env.VITE_API_KEY_Llama;

// --- UI Elements ---
// Sidebar
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const newChatButton = document.getElementById('new-chat-button');
const chatHistoryList = document.getElementById('chat-history-list');
// Top Bar
const topBar = document.getElementById('top-bar');
const modelSelector = document.getElementById('model-selector');
const userInfo = document.getElementById('user-info'); // Keep reference if needed later
const profilePicture = document.getElementById('profile-picture'); // Keep reference if needed later
const toggleMenuButton = document.getElementById('toggle-menu-button'); // Ellipsis button
// Main Content
const mainContent = document.getElementById('main-content');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById("chat-messages");
const userInputArea = document.getElementById('user-input');
const inputText = document.getElementById("input-text");
const sendButton = document.getElementById("send-button");
// Modals & Popovers
const menuWindow = document.getElementById("menu-window"); // Top-right menu
const aboutButton = document.getElementById("about-button");
const changelogButton = document.getElementById("changelog-button");
const githubButton = document.getElementById("github-button");
// Note: settingsButton is removed from HTML, so remove reference here
// const settingsButton = document.getElementById("settings-button");
const aboutScreen = document.getElementById("about-screen");
const aboutScreenCloseButton = document.getElementById("about-screen-close-button");
const changelogScreen = document.getElementById("changelog-screen");
const changelogScreenCloseButton = document.getElementById("changelog-screen-close-button");
const chatActionPopover = document.getElementById('chat-action-popover');

// --- State Variables ---
let conversationHistory = []; // Holds messages for the *current* chat API call
let allChats = {}; // Stores all chat objects { chatId: { id, model, title, messages: [], createdAt } }
let currentChatId = null; // ID of the currently active chat
let models = []; // Loaded from models.json
let isSidebarCollapsed = false;
let activePopoverChatId = null; // Track chat ID for the action popover
let isLoadingResponse = false; // Prevent multiple simultaneous requests

const originalSendButtonContent = sendButton.innerHTML; // Store initial button content (icon)

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Loaded. Initializing nAI...");
    await loadModelsAndInitialize();
    loadAllChatsFromStorage();
    initializeSidebarState();

    const lastChatId = localStorage.getItem(CURRENT_CHAT_ID_KEY);
    if (lastChatId && allChats[lastChatId]) {
        console.log(`Loading last chat: ${lastChatId}`);
        loadChat(lastChatId);
    } else {
        console.log("No last chat found or invalid, starting new chat.");
        startNewChat(); // Start a new chat if none exists or last one is invalid
    }

    // Ensure render happens *after* potential startNewChat
    renderChatHistoryList();
    adjustLayoutForSidebar();
    setupEventListeners();
    console.log("nAI Initialization complete.");
});


// --- Core Chat Functions ---

function startNewChat() {
    console.log("Starting new chat...");
    const newChatId = `chat_${Date.now()}`;
    const preferredModel = localStorage.getItem(PREFERRED_MODEL_KEY) || (models.length > 0 ? models[0].name : 'default'); // Get preferred model

    currentChatId = newChatId;
    conversationHistory = []; // Reset history for API calls
    allChats[currentChatId] = {
        id: currentChatId,
        model: preferredModel,
        title: "New Chat",
        messages: [], // Start with empty messages array
        createdAt: Date.now()
    };

    localStorage.setItem(CURRENT_CHAT_ID_KEY, currentChatId);
    saveAllChatsToStorage(); // Save the new empty chat structure
    renderChatHistoryList(); // Update sidebar list
    clearChatMessagesUI(); // Clear the message display area
    inputText.value = "";
    inputText.focus();
    isLoadingResponse = false; // Ensure loading state is reset
    hideLoadingDots(sendButton); // Ensure button is not stuck in loading
    console.log(`New chat ${currentChatId} started with model ${preferredModel}`);
}

function loadChat(chatId) {
    if (!allChats[chatId]) {
        console.error(`Attempted to load non-existent chat: ${chatId}. Starting new chat.`);
        startNewChat();
        return;
    }
    console.log(`Loading chat: ${chatId}`);
    currentChatId = chatId;
    const chatData = allChats[chatId];
    // conversationHistory is rebuilt before each API call, no need to load it here directly for that.
    // We load messages directly for display.
    localStorage.setItem(CURRENT_CHAT_ID_KEY, currentChatId);

    clearChatMessagesUI();
    const modelData = models.find(m => m.name === chatData.model);
    const modelLabel = modelData?.label || 'nAI';
    const modelAIPP = modelData?.AIPP || DEFAULT_AIPP;

    if (chatData.messages && Array.isArray(chatData.messages)) {
        chatData.messages.forEach(msg => {
            const isAI = msg.role !== 'user';
            // Use correct sender label and AIPP for rendering
            appendMessageUI(isAI ? modelLabel : "User", msg.content, isAI, isAI ? modelAIPP : null);
        });
    } else {
        console.warn(`Chat ${chatId} has no messages or messages are not an array.`);
        chatData.messages = []; // Ensure it's an array
    }


    renderChatHistoryList(); // Highlight the loaded chat in the sidebar
    isLoadingResponse = false; // Reset loading state
    hideLoadingDots(sendButton);
    console.log(`Chat ${chatId} loaded successfully.`);
}

// --- Storage Functions ---

function loadAllChatsFromStorage() {
    try {
        const storedChats = localStorage.getItem(CHAT_HISTORY_KEY);
        allChats = storedChats ? JSON.parse(storedChats) : {};
        // Basic validation/migration if needed
        Object.values(allChats).forEach(chat => {
             if (!chat.messages || !Array.isArray(chat.messages)) {
                 console.warn(`Chat ${chat.id} has invalid messages format, resetting.`);
                 chat.messages = [];
             }
             if (!chat.createdAt) { // Add timestamp if missing
                 chat.createdAt = Date.now();
             }
        });
        console.log(`Loaded ${Object.keys(allChats).length} chats from storage.`);
    } catch (error) {
        console.error("Error loading chats from localStorage:", error);
        allChats = {}; // Reset to empty if storage is corrupted
        showError("Failed to load chat history from storage.");
    }
}

function saveAllChatsToStorage() {
    try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(allChats));
        // console.log("Chats saved to storage.");
    } catch (e) {
        console.error("Error saving chats to localStorage:", e);
        showError("Could not save chat history. Storage might be full.");
    }
}

// --- Message Handling ---

// Appends a message visually to the chat window
function appendMessageUI(sender, message, isAI, profilePicUrl = null) {
    try {
        // System messages for errors etc.
        const isSystem = sender === "System";
        const element = createMessageElement(sender, message, isAI || isSystem, profilePicUrl);
        if (isSystem) {
            element.classList.add('system'); // Add specific class for styling system messages
        }
        chatMessages.appendChild(element);
        // Scroll to bottom smoothly
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    } catch (error) {
         console.error("Error creating message element:", error);
         // Fallback append if createMessageElement fails
         const fallbackDiv = document.createElement('div');
         fallbackDiv.textContent = `[${sender}]: ${message}`;
         fallbackDiv.style.color = isAI ? '#aaa' : '#fff';
         chatMessages.appendChild(fallbackDiv);
         chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Adds message to UI, state object, and saves to localStorage
function appendAndSaveMessage(senderLabel, message, isAI) {
    if (!currentChatId || !allChats[currentChatId]) {
        console.error("Cannot append message: No active chat.");
        showError("No active chat selected. Please start a new chat.");
        return;
    }

    // Determine profile picture based on AI status and model
    const currentModelData = models.find(m => m.name === allChats[currentChatId].model);
    const profilePic = isAI ? (currentModelData?.AIPP || DEFAULT_AIPP) : null;

    appendMessageUI(senderLabel, message, isAI, profilePic);

    // Ensure the messages array exists
    if (!allChats[currentChatId].messages) {
        allChats[currentChatId].messages = [];
    }

    // Add message to the state object for saving
    const messageData = {
        role: isAI ? "assistant" : "user", // Use 'assistant' consistently for saving
        content: message
    };
    allChats[currentChatId].messages.push(messageData);

    // Update chat title on the first user message
    if (allChats[currentChatId].messages.length === 1 && !isAI) {
        const newTitle = message.substring(0, 40) + (message.length > 40 ? '...' : '');
        allChats[currentChatId].title = newTitle;
        // Update the title in the sidebar immediately
        const listItem = chatHistoryList.querySelector(`li[data-chat-id="${currentChatId}"] .chat-title`);
        if (listItem) {
            listItem.textContent = newTitle;
        } else {
            renderChatHistoryList(); // Full render if item not found easily
        }
    }

    saveAllChatsToStorage(); // Save changes after adding message
}

// Handles the process of sending a message
async function handleSendMessage() {
    const userMessageText = inputText.value.trim();
    if (userMessageText === "" || isLoadingResponse) return; // Prevent empty or double send

    if (!currentChatId || !allChats[currentChatId]) {
        console.warn("No current chat, starting new one before sending.");
        startNewChat();
        // Ensure state is ready after new chat is created
        if (!currentChatId || !allChats[currentChatId]) {
            showError("Failed to initialize chat. Please try again.");
            return;
        }
    }

    const currentModelName = allChats[currentChatId].model;
    const selectedModelData = models.find(m => m.name === currentModelName);

    if (!selectedModelData) {
        showError(`Configuration for model '${currentModelName}' not found. Cannot send message.`);
        return;
    }

    isLoadingResponse = true; // Set loading flag
    showLoadingDots(sendButton);
    inputText.value = ""; // Clear input

    // Append user message immediately
    appendAndSaveMessage("User", userMessageText, false);

    // --- Prepare history for API ---
    // Get the latest messages from the *saved* state for the current chat
    const currentMessages = allChats[currentChatId].messages || [];
    // Map to the format expected by the API (limit history size)
    conversationHistory = currentMessages.slice(-20).map(msg => ({
        role: msg.role, // Keep 'user' and 'assistant'
        content: msg.content
    }));

    // Generate AI response
    try {
        console.log(`Sending message to model: ${selectedModelData.label}`);
        await generateResponse(selectedModelData, userMessageText); // Pass model config and latest message
    } catch (error) {
         console.error("Error during generateResponse call:", error);
         // Append error message (already handled inside generateResponse's catch block)
    } finally {
        isLoadingResponse = false; // Reset loading flag
        hideLoadingDots(sendButton);
        inputText.focus();
    }
}

// --- Model & Generation Functions ---

async function loadModelsAndInitialize() {
    try {
        const response = await fetch('/models.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        models = await response.json();
        // Basic validation of model structure
        if (!Array.isArray(models) || models.length === 0) {
             throw new Error("Models data is empty or not an array.");
        }
        models.forEach(m => {
            if (!m.name || !m.label || !m.api_key || !m.model_name) {
                 console.warn("Incomplete model data found:", m);
            }
            // Ensure iterable fields are arrays, correcting the "n is not iterable" root cause
            m.safety_settings = m.safety_settings || [];
            m.prompt_parts = m.prompt_parts || [];
            m.stop_sequences = m.stop_sequences || []; // For Bison
            // Ensure generation_config exists
            m.generation_config = m.generation_config || {};
        });

        populateModelSelector(models);
        initializeModelSelection();
        console.log("Models loaded and selector populated.");
    } catch (error) {
        console.error("Failed to load or process models.json:", error);
        showError(`Could not load AI models: ${error.message}`);
        models = []; // Ensure models is an empty array on failure
        populateModelSelector([]); // Clear selector
    }
}


function populateModelSelector(modelsToPopulate) {
    modelSelector.innerHTML = ''; // Clear existing options
    if (!Array.isArray(modelsToPopulate)) return; // Guard against non-array

    modelsToPopulate.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name; // Internal name
        option.text = model.label; // User-facing label
        modelSelector.appendChild(option);
    });
}

function initializeModelSelection() {
    const preferredModel = localStorage.getItem(PREFERRED_MODEL_KEY);
    // Check if models array has been populated
    if (models && models.length > 0) {
         if (preferredModel && models.some(m => m.name === preferredModel)) {
             modelSelector.value = preferredModel;
         } else {
             modelSelector.value = models[0].name; // Default to first model
             localStorage.setItem(PREFERRED_MODEL_KEY, models[0].name); // Save default
         }
    } else {
         console.warn("Cannot initialize model selection: models array is empty.");
         // Optionally display a message in the selector
         const option = document.createElement('option');
         option.text = "No models loaded";
         option.disabled = true;
         modelSelector.appendChild(option);
    }
}


// Main function to generate AI response
async function generateResponse(model, userMessage /* Pass user message explicitly */) {
    console.log(`Generating response using model: ${model.label}`);
    // conversationHistory should be up-to-date from handleSendMessage

    // Date and q/a (often less reliable than full history)
    const date = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDate = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} - ${days[date.getDay()]}`;
    // Get q/a from the *actual* conversationHistory prepared for the API
    let q = conversationHistory.length > 1 ? conversationHistory[conversationHistory.length - 2]?.content : "";
    let a = conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1]?.content : "";


    try {
        let aiResponseText = "Error: Model response generation failed."; // Default error

        // --- API Call Logic ---
        if (model.api_key === "API_KEY_Text_Bison") {
            console.log("Calling Text Bison API...");
            const safetySettingsPayload = model.safety_settings.map(s => ({ category: s.category, threshold: s.threshold || 4 })); // Use defaults if missing
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta3/models/${model.model_name}:generateText?key=${API_KEY_Text_Bison}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    'prompt': { 'text': (model.prompt || '').replace('${userMessage}', userMessage).replace('${q}', q).replace('${a}', a).replace('${date}', currentDate) },
                    'temperature': model.generation_config.temperature || 0.7,
                    'top_k': model.generation_config.top_k || 40,
                    'top_p': model.generation_config.top_p || 0.95,
                    'candidate_count': 1,
                    'max_output_tokens': model.generation_config.max_output_tokens || 1024,
                    'stop_sequences': model.stop_sequences || [], // Ensure it's an array
                    'safety_settings': safetySettingsPayload
                })
            });
            if (!response.ok) throw new Error(`Bison API Error (${response.status}): ${await response.text()}`);
            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].output) throw new Error("Bison API returned no valid response.");
            aiResponseText = data.candidates[0].output;
            console.log("Bison response received.");

        } else if (model.api_key === "API_KEY_Gemini") {
             console.log("Calling Gemini (Non-Chat) API...");
             const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
             const modelInstance = genAI.getGenerativeModel({ model: model.model_name });
             const generationConfig = model.generation_config || {};
             // Map safety settings, ensuring HarmCategory/Threshold exist
             const safetySettings = model.safety_settings.map(setting => ({
                 category: HarmCategory[setting.category] || HarmCategory.HARM_CATEGORY_UNSPECIFIED,
                 threshold: HarmBlockThreshold[setting.threshold] || HarmBlockThreshold.BLOCK_NONE
             }));
             // Map prompt parts
             const parts = model.prompt_parts.map(part => ({
                  text: (part || '').replace('${userMessage}', userMessage).replace('${q}', q).replace('${a}', a).replace('${date}', currentDate)
             }));

             const result = await modelInstance.generateContent({
                  contents: [{ role: "user", parts }], generationConfig, safetySettings,
             });
             aiResponseText = result.response.text();
             console.log("Gemini (Non-Chat) response received.");

        } else if (model.api_key === "API_KEY_G/C") {
             console.log("Calling Gemini Chat API...");
             const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
             const modelInstance = genAI.getGenerativeModel({
                  model: model.model_name,
                  systemInstruction: (model.prompt_parts || []).join(' '), // Combine prompt parts for system instruction
             });
             const generationConfig = model.generation_config || {};
             const safetySettings = model.safety_settings.map(setting => ({
                  category: HarmCategory[setting.category] || HarmCategory.HARM_CATEGORY_UNSPECIFIED,
                  threshold: HarmBlockThreshold[setting.threshold] || HarmBlockThreshold.BLOCK_NONE
             }));
             // Prepare history for Gemini Chat (needs 'model' role instead of 'assistant')
             const historyForGeminiChat = conversationHistory.slice(0, -1).map(msg => ({ // Exclude the last user message
                 role: msg.role === 'assistant' ? 'model' : msg.role,
                 parts: [{ text: msg.content }]
             }));

             const chatSession = modelInstance.startChat({ generationConfig, safetySettings, history: historyForGeminiChat });
             const result = await chatSession.sendMessage(userMessage); // Send only the latest user message
             aiResponseText = result.response.text();
             console.log("Gemini Chat response received.");

        } else if (model.api_key === "API_KEY_Llama") {
            console.log("Calling Llama (Groq) API...");
            const groq = new Groq({ apiKey: API_KEY_Llama, dangerouslyAllowBrowser: true });
            // Prepare messages for Groq (system prompt + full history)
             const messagesForGroq = [
                 { role: "system", content: (model.prompt_parts || []).join(' ') },
                 // Map conversationHistory directly (user/assistant roles)
                 ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content }))
             ];

            const chatCompletion = await groq.chat.completions.create({
                messages: messagesForGroq,
                model: model.model_name,
                temperature: model.generation_config.temperature ?? 0.7, // Use nullish coalescing for defaults
                max_tokens: model.generation_config.max_tokens ?? 1024,
                top_p: model.generation_config.top_p ?? 0.9,
                stream: model.generation_config.stream ?? false,
                stop: model.generation_config.stop || null
            });

             if (model.generation_config.stream) {
                 // Handle streaming response (more complex: requires updating UI incrementally)
                 console.warn("Streaming for Llama not fully implemented for UI updates yet.");
                 // For now, just collect the full response if possible (might depend on SDK)
                 aiResponseText = chatCompletion?.choices?.[0]?.message?.content || "Error processing stream.";
             } else {
                 aiResponseText = chatCompletion.choices[0]?.message?.content || "No response from Llama model.";
             }
             console.log("Llama response received.");
        } else {
             throw new Error(`Unsupported API key type specified in model config: ${model.api_key}`);
        }

        // Append successful response
        appendAndSaveMessage(model.label, aiResponseText, true);

    } catch (error) {
        console.error("Error during API call or response processing:", error);
        // Append specific error message to the chat
        appendAndSaveMessage("System", `Error: ${error.message || "Failed to get response from model."}`, true); // isAI=true for system message styling
    }
}


// --- UI & Layout Functions ---

function renderChatHistoryList() {
    chatHistoryList.innerHTML = '';
    hidePopover();

    const sortedChatIds = Object.keys(allChats).sort((a, b) => (allChats[b]?.createdAt || 0) - (allChats[a]?.createdAt || 0));

    sortedChatIds.forEach(chatId => {
        const chat = allChats[chatId];
        if (!chat) return; // Skip if chat data is somehow invalid

        const listItem = document.createElement('li');
        listItem.dataset.chatId = chatId;
        listItem.title = chat.title; // Tooltip

        const titleSpan = document.createElement('span');
        titleSpan.className = 'chat-title';
        titleSpan.textContent = chat.title || `Chat ${chatId}`;
        listItem.appendChild(titleSpan);

        const actionsButton = document.createElement('span');
        actionsButton.className = 'chat-actions';
        actionsButton.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
        actionsButton.title = 'Chat Actions';
        actionsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            showPopover(event.currentTarget, chatId);
        });
        listItem.appendChild(actionsButton);

        if (chatId === currentChatId) {
            listItem.classList.add('active-chat');
        }

        listItem.addEventListener('click', () => {
            if (currentChatId !== chatId && !isLoadingResponse) { // Prevent switching while loading
                loadChat(chatId);
            }
             // Close sidebar on mobile after selection
             if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
                 toggleSidebar(false); // Force close
             }
        });
        chatHistoryList.appendChild(listItem);
    });
}

function clearChatMessagesUI() {
    chatMessages.innerHTML = '';
}

// Toggles sidebar visibility (can force state)
function toggleSidebar(forceState) {
    const shouldBeCollapsed = (forceState !== undefined) ? forceState : !isSidebarCollapsed;
    if (shouldBeCollapsed === isSidebarCollapsed) return; // No change needed

    isSidebarCollapsed = shouldBeCollapsed;
    // Use transform for mobile, class for desktop
    if (window.innerWidth <= 768) {
        sidebar.style.transform = isSidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)';
    } else {
        sidebar.classList.toggle('collapsed', isSidebarCollapsed);
    }

    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isSidebarCollapsed);
    adjustLayoutForSidebar(); // Adjust main content margin/width
}


// Adjusts main content margin based on sidebar state and screen size
function adjustLayoutForSidebar() {
     // On mobile, sidebar overlays, so main content always takes full width
     if (window.innerWidth <= 768) {
         mainContent.style.marginLeft = '0px';
     } else {
         // On desktop, adjust margin based on collapsed state
         const sidebarCurrentWidth = sidebar.classList.contains('collapsed')
                                     ? '0px'
                                     : getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim(); // Read from CSS var
         mainContent.style.marginLeft = sidebarCurrentWidth;
     }
}

// Load initial sidebar state
function initializeSidebarState() {
    isSidebarCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    // Set initial state without transition for immediate effect
    sidebar.style.transition = 'none'; // Disable transition temporarily
    if (window.innerWidth <= 768) {
         sidebar.style.transform = isSidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)';
    } else {
         sidebar.classList.toggle('collapsed', isSidebarCollapsed);
    }
    adjustLayoutForSidebar(); // Set initial margin
    // Re-enable transitions after a very short delay
    setTimeout(() => {
         sidebar.style.transition = 'width 0.3s ease, padding 0.3s ease, transform 0.3s ease';
    }, 50);
}


// --- Popover Functions --- (Keep existing show/hide/handleClickOutside)
function showPopover(targetElement, chatId) {
    // Ensure previous popover is hidden
    hidePopover();
    activePopoverChatId = chatId;
    const rect = targetElement.getBoundingClientRect();
    // Calculate position (adjust as needed for better placement)
    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX - chatActionPopover.offsetWidth + rect.width;

    // Prevent popover going off-screen
    if (left < 0) left = 10;
    if (top + chatActionPopover.offsetHeight > window.innerHeight + window.scrollY) {
        top = rect.top + window.scrollY - chatActionPopover.offsetHeight - 5; // Show above if not enough space below
    }

    chatActionPopover.style.top = `${top}px`;
    chatActionPopover.style.left = `${left}px`;
    chatActionPopover.style.display = 'block';
    setTimeout(() => { document.addEventListener('click', handleClickOutsidePopover, { capture: true, once: true }); }, 0);
}
function hidePopover() {
    activePopoverChatId = null;
    chatActionPopover.style.display = 'none';
    document.removeEventListener('click', handleClickOutsidePopover, { capture: true });
}
function handleClickOutsidePopover(event) {
    if (!chatActionPopover.contains(event.target) && !event.target.closest('.chat-actions')) {
        hidePopover();
    } else {
        // Re-attach listener if click was inside but didn't close it (e.g., on disabled button)
         if (chatActionPopover.style.display === 'block') {
             document.addEventListener('click', handleClickOutsidePopover, { capture: true, once: true });
         }
    }
}

// --- History Item Action Functions --- (Keep existing rename/delete/share/print)
function handlePopoverAction(event) { /* Keep existing logic */
     const button = event.target.closest('button');
     if (!button || !activePopoverChatId) return;
     const action = button.dataset.action;
     console.log(`Popover action: ${action} for chat ${activePopoverChatId}`);
     switch (action) {
          case 'rename': renameChat(activePopoverChatId); break;
          case 'share': shareChat(activePopoverChatId); break;
          case 'print': printChat(activePopoverChatId); break;
          case 'delete': deleteChat(activePopoverChatId); break;
          default: console.warn("Unknown popover action:", action); hidePopover();
     }
 }
// --- renameChat, deleteChat, shareChat, printChat functions (keep existing logic using SweetAlert2/confirm/prompt) ---
// Add basic implementations if missing
function renameChat(chatId) {
    if (!allChats[chatId]) return;
    const currentTitle = allChats[chatId].title;
    const newTitle = prompt("Enter new name:", currentTitle); // Use Swal if preferred
    if (newTitle && newTitle.trim() !== "" && newTitle !== currentTitle) {
        allChats[chatId].title = newTitle.trim();
        saveAllChatsToStorage();
        renderChatHistoryList();
    }
    hidePopover();
}
function deleteChat(chatId) {
    if (!allChats[chatId]) return;
    if (confirm(`Delete chat "${allChats[chatId].title}"?`)) { // Use Swal if preferred
        delete allChats[chatId];
        saveAllChatsToStorage();
        if (currentChatId === chatId) {
            const remainingChatIds = Object.keys(allChats).sort((a, b) => allChats[b].createdAt - allChats[a].createdAt);
            loadChat(remainingChatIds[0] || startNewChat()); // Load newest or start new
        } else {
            renderChatHistoryList();
        }
    }
    hidePopover();
}
function shareChat(chatId) { /* Keep existing Markdown generation/download */
     if (!allChats[chatId]) return;
     // ... (generate markdownContent) ...
     const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
     // ... (create link, click, cleanup) ...
     hidePopover();
 }
 function printChat(chatId) { /* Keep existing hide/print/restore logic */
     if (!allChats[chatId]) return;
     // ... (load chat, hide elements, print, restore) ...
     hidePopover();
 }

// --- Event Listeners Setup ---
function setupEventListeners() {
    console.log("Setting up event listeners...");
    // Sidebar
    sidebarToggle.addEventListener('click', () => toggleSidebar()); // Use default toggle behavior
    newChatButton.addEventListener('click', startNewChat);

    // Top Bar
    modelSelector.addEventListener('change', handleModelSelectionChange);
    toggleMenuButton.addEventListener('click', handleMenuToggle); // Use separate handler

    // User Input
    sendButton.addEventListener('click', handleSendMessage);
    inputText.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });

    // Popovers & Modals
    chatActionPopover.addEventListener('click', handlePopoverAction);
    setupModalButtonListeners(); // Setup About, Changelog, GitHub clicks

    // Window Level
    window.addEventListener('resize', adjustLayoutForSidebar);
    document.addEventListener('keydown', handleGlobalKeyDown); // Handle Esc key
    console.log("Event listeners setup complete.");
}

// Specific handler for top-right menu toggle
function handleMenuToggle(event) {
    event.stopPropagation();
    menuWindow.classList.toggle('opened');
    if (menuWindow.classList.contains('opened')) {
        // Add listener to close when clicking outside this menu
        document.addEventListener('click', handleOutsideMenuClick, { capture: true, once: true });
    } else {
        document.removeEventListener('click', handleOutsideMenuClick, { capture: true });
    }
}

// Close top-right menu if click is outside
function handleOutsideMenuClick(event) {
    if (!menuWindow.contains(event.target) && !toggleMenuButton.contains(event.target)) {
        menuWindow.classList.remove('opened');
    } else if (menuWindow.classList.contains('opened')) {
        // Re-attach if click was inside to keep listening
        document.addEventListener('click', handleOutsideMenuClick, { capture: true, once: true });
    }
}

// Handle Esc key press for closing modals/popovers
function handleGlobalKeyDown(event) {
    if (event.key === 'Escape') {
        console.log("Escape key pressed.");
        // Close modals
        document.querySelectorAll('.modal-window.opened').forEach(modal => modal.classList.remove('opened'));
        // Close top-right menu
        if (menuWindow.classList.contains('opened')) {
             menuWindow.classList.remove('opened');
             document.removeEventListener('click', handleOutsideMenuClick, { capture: true }); // Clean up listener
        }
        // Close action popover
        hidePopover();
    }
}

// Setup for modal windows (About, Changelog, GitHub)
function setupModalButtonListeners() {
    // Ensure buttons exist before adding listeners
    if (aboutButton) aboutButton.onclick = () => { menuWindow.classList.remove('opened'); aboutScreen.classList.add('opened'); };
    if (aboutScreenCloseButton) aboutScreenCloseButton.onclick = () => aboutScreen.classList.remove('opened');

    if (changelogButton) changelogButton.onclick = () => { menuWindow.classList.remove('opened'); changelogScreen.classList.add('opened'); };
    if (changelogScreenCloseButton) changelogScreenCloseButton.onclick = () => changelogScreen.classList.remove('opened');

    if (githubButton) githubButton.onclick = () => { menuWindow.classList.remove('opened'); window.open('https://github.com/mehmetabak/nAI', '_blank'); };

    // Settings button listener is removed as the button is removed from HTML
}

// Model selection only affects *new* chats
function handleModelSelectionChange() {
    const selectedModel = modelSelector.value;
    localStorage.setItem(PREFERRED_MODEL_KEY, selectedModel);
    console.log(`Preferred model for new chats set to: ${selectedModel}`);
    // Optional: Show a transient notification
    // showNotification(`Model '${getModelLabel(selectedModel)}' selected for new chats.`);
}

// --- Utility Functions ---

function getModelLabel(modelName) {
    const model = models.find(m => m?.name === modelName); // Add safe navigation
    return model ? model.label : 'nAI'; // Fallback
}

function showLoadingDots(button) {
    button.disabled = true;
    button.classList.add('loading');
    // Icon is hidden via CSS using the .loading class
}

function hideLoadingDots(button) {
    button.disabled = false;
    button.classList.remove('loading');
}

function showError(message) {
    console.error("Application Error:", message);
    // Use SweetAlert if available and loaded
    if (typeof Swal !== 'undefined') {
         Swal.fire({ icon: 'error', title: 'Error', text: message });
    } else {
        alert(`Error: ${message}`); // Fallback
    }
     // Optionally append as system message
     // appendMessageUI("System", `Error: ${message}`, true);
}

// --- Make sure createMessageElement is defined ---
// Example placeholder if it's not imported correctly
/*
function createMessageElement(sender, message, isAI, profilePicUrl) {
     const div = document.createElement('div');
     div.classList.add('message', isAI ? 'ai' : 'user');
     // Add avatar (optional)
     // Add content div
     div.innerHTML = `<div class="content">${message}</div>`; // Simplified
     return div;
}
*/