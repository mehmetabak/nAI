// main.js
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import Groq from 'groq-sdk';
import { showNotification } from './tools/notification';
import { createMessageElement } from './components/message.js';
import { initializeSidebar, getActiveChatId, loadChatHistory, saveChatHistory } from './components/sidebar.js';
import Swal from 'sweetalert2'; // Import Swal directly if needed here

// --- API Keys ---
const API_KEY_Gemini = import.meta.env.VITE_API_KEY_Gemini;
const API_KEY_Text_Bison = import.meta.env.VITE_API_KEY_Text_Bison;
const API_KEY_Llama = import.meta.env.VITE_API_KEY_Llama;

// --- UI Elements (references assigned in DOMContentLoaded) ---
let mainMenu;
let mainMenuOpenButton;
let mainMenuCloseButton;
let clearButton;
let sendMessageButton;
let chatHeader;
let modelSettingsButton;
let aboutButton;
let changelogButton;
let githubButton;
let modelSelector;
let modelWindow;
let modelWindowCloseButton;
let aboutScreen;
let aboutScreenCloseButton;
let changelogScreen;
let changelogScreenCloseButton;
let chatMessages;
let inputText;
let originalSendButtonText = "Send"; // Default

// --- State ---
let whichMenuIsOn = null; // Track which popup/modal is open
let emptySpace; // Reference to the bottom padding div
let isEmptySpaceAdded = false; // Flag for bottom padding

// --- Model & Chat Data ---
let conversationHistory = []; // Active chat history in memory
let models = []; // Loaded models from JSON
let q = `!`; // Last question context
let a = `!`; // Last answer context
const AIPP_USER = "https://images.vexels.com/media/users/3/137047/isolated/lists/5831a17a290077c646a48c4db78a81bb-user-profile-blue-icon.png"; // User PP
const AIPP_DEFAULT_AI = "https://static-00.iconduck.com/assets.00/ai-human-icon-256x256-j1bia0vl.png"; // Default AI PP
const AIPP_ERROR = "https://i.imgur.com/2Rs5ya9.png"; // Error PP

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded and parsed");

  // Assign UI Element references now that DOM is ready
  assignUIElements();

  // Create bottom empty space div
  createEmptySpaceDiv();

  // Add essential event listeners
  addCoreEventListeners();

  // Load models and then initialize sidebar
  fetchModelsAndInitialize();

  // Initial notification logic (optional)
  // handleInitialNotification();
});

function assignUIElements() {
  mainMenu = document.getElementById("menu-window");
  mainMenuOpenButton = document.getElementById("toggle-menu-button");
  mainMenuCloseButton = document.getElementById("menu-window-close");
  clearButton = document.getElementById("clear-button");
  sendMessageButton = document.getElementById("send-button");
  chatHeader = document.getElementById("chat-header");
  modelSettingsButton = document.getElementById("settings-button");
  aboutButton = document.getElementById("about-button");
  changelogButton = document.getElementById("changelog-button");
  githubButton = document.getElementById("github-button");
  modelSelector = document.getElementById('model-selector');
  modelWindow = document.getElementById("model-window");
  modelWindowCloseButton = document.getElementById("model-window-close-button");
  aboutScreen = document.getElementById("about-screen");
  aboutScreenCloseButton = document.getElementById("about-screen-close-button");
  changelogScreen = document.getElementById("changelog-screen");
  changelogScreenCloseButton = document.getElementById("changelog-screen-close-button");
  chatMessages = document.getElementById("chat-messages");
  inputText = document.getElementById("input-text");

  // Check if crucial elements exist
   if (!sendMessageButton || !inputText || !chatMessages || !modelSelector || !mainMenuOpenButton) {
       console.error("CRITICAL ERROR: One or more essential UI elements could not be found. Check IDs in index.html.");
       // Optionally display a user-facing error message on the page
       document.body.innerHTML = '<h1>Error initializing application. Please check console.</h1>';
   } else {
       originalSendButtonText = sendMessageButton.textContent; // Store original text
   }
}

function createEmptySpaceDiv() {
  emptySpace = Object.assign(document.createElement('div'), {
      innerHTML: ' ',
      style: 'height: 14vh; flex-shrink: 0;' // Prevent shrinking
  });
}

function addCoreEventListeners() {
   if (!sendMessageButton || !inputText || !mainMenuOpenButton || !clearButton) return; // Guard

  sendMessageButton.addEventListener('click', handleSendMessage);
  inputText.addEventListener('keydown', handleInputKeydown);
  mainMenuOpenButton.addEventListener('click', toggleMainMenu);
  clearButton.addEventListener('click', handleClearChat);

  // Add listeners for other menus/popups if elements exist
  mainMenuCloseButton?.addEventListener('click', () => toggleMainMenu(false)); // Force close
  modelSettingsButton?.addEventListener('click', () => openSubMenu(modelWindow, "settings"));
  modelWindowCloseButton?.addEventListener('click', () => closeSubMenu(modelWindow));
  aboutButton?.addEventListener('click', () => openSubMenu(aboutScreen, "about"));
  aboutScreenCloseButton?.addEventListener('click', () => closeSubMenu(aboutScreen));
  changelogButton?.addEventListener('click', () => openSubMenu(changelogScreen, "changelog"));
  changelogScreenCloseButton?.addEventListener('click', () => closeSubMenu(changelogScreen));
  githubButton?.addEventListener('click', () => window.open('https://github.com/mehmetabak/nAI', '_blank'));

   // Model selector change listener
   modelSelector?.addEventListener('change', handleModelSelectionChange);
}


function fetchModelsAndInitialize() {
   // Fetch models from the /public directory
  fetch('/models.json')
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
      })
      .then(data => {
          models = data;
          populateModelSelector(models);
          // Initialize sidebar *after* models are loaded and selector populated
          initializeSidebar(loadAndDisplayChat); // Pass the callback function
      })
      .catch(error => {
          console.error("Error loading or parsing models.json:", error);
          chatHeader.textContent = "Model Error"; // Update header
          // Inform user more prominently
           Swal.fire({
               title: 'Model Loading Failed',
               text: `Could not load model configurations (models.json). Some features might be unavailable. Error: ${error.message}`,
               icon: 'error',
               background: '#2c2c2c',
               color: '#ecf0f1'
           });
           // Still initialize sidebar, but model selection won't work
           if (modelSelector) modelSelector.disabled = true; // Disable selector
           initializeSidebar(loadAndDisplayChat);
      });
}

// --- Model Selection ---

function getModelDetails(modelName) {
  return models.find(m => m.name === modelName);
}

function populateModelSelector(loadedModels) {
  if (!modelSelector) return; // Guard if selector doesn't exist

  modelSelector.innerHTML = ''; // Clear existing options (like "Loading...")
  if (!loadedModels || loadedModels.length === 0) {
       const option = document.createElement('option');
       option.value = "";
       option.text = "No models loaded";
       modelSelector.appendChild(option);
       modelSelector.disabled = true;
       return;
  }

  modelSelector.disabled = false;
  loadedModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model.name;
      option.text = model.label;
      modelSelector.appendChild(option);
  });

  const storedModel = localStorage.getItem('model');
  if (storedModel && loadedModels.some(m => m.name === storedModel)) {
      modelSelector.value = storedModel;
  } else {
      modelSelector.value = loadedModels[0].name;
      localStorage.setItem('model', loadedModels[0].name);
  }
  updateChatHeaderWithModel();
}

function handleModelSelectionChange() {
  if (!modelSelector) return;
  const selectedModel = modelSelector.value;
  localStorage.setItem('model', selectedModel);
  updateChatHeaderWithModel();
  // Model change takes effect on the *next* message sent in the current chat
  // or immediately in a new chat.
}

function updateChatHeaderWithModel() {
   if (!chatHeader) return;
  const selectedModelName = localStorage.getItem('model');
  const model = getModelDetails(selectedModelName);
  chatHeader.textContent = model ? model.label : 'nAI';
}


// --- Chat Loading and Display ---

function loadAndDisplayChat(chatId) {
  console.log("Loading chat:", chatId);
  if (!chatMessages) return; // Guard

  if (!chatId) {
      chatMessages.innerHTML = '';
      conversationHistory = [];
      addEmptySpaceIfNeeded(); // Add padding even if empty
      updateChatHeaderWithModel(); // Ensure header is correct
      q = '!'; a = '!'; // Reset context
      return;
  }

  conversationHistory = loadChatHistory(chatId);
  console.log("Loaded history:", conversationHistory.length, "messages");

  chatMessages.innerHTML = '';
  isEmptySpaceAdded = false; // Reset flag before rendering

  conversationHistory.forEach(msg => {
      const messageElement = createMessageElement(
          msg.senderLabel || (msg.isAI ? "AI" : "User"), // Use stored label or default
          msg.message,
          msg.isAI,
          msg.AIPP || (msg.isAI ? AIPP_DEFAULT_AI : AIPP_USER) // Use stored PP or default
      );
      chatMessages.appendChild(messageElement);
  });

  addEmptySpaceIfNeeded();
  // Scroll after a tiny delay to allow rendering
   setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
   }, 0);


  updateChatHeaderWithModel();
  // Reset context for the loaded chat based on its *last* messages
   const lastUserMsg = [...conversationHistory].reverse().find(m => !m.isAI);
   const lastAiMsg = [...conversationHistory].reverse().find(m => m.isAI);
   q = lastUserMsg ? lastUserMsg.message : '!';
   a = lastAiMsg ? lastAiMsg.message : '!';
   console.log(`Context reset: q="${q.substring(0,20)}...", a="${a.substring(0,20)}..."`)
}

// --- Message Handling ---

function appendMessage(senderLabel, message, isAI, senderAIPP) {
  const activeChatId = getActiveChatId();
  if (!activeChatId || !chatMessages) {
      console.error("Cannot append message, no active chat or chatMessages element!");
      return;
  }

  const messageElement = createMessageElement(senderLabel, message, isAI, senderAIPP);

  // Remove empty space before adding new message
  if (isEmptySpaceAdded && emptySpace.parentNode === chatMessages) {
      chatMessages.removeChild(emptySpace);
      isEmptySpaceAdded = false; // Reset flag earlier
  }
  chatMessages.appendChild(messageElement);
  addEmptySpaceIfNeeded(); // Re-add empty space at the end

   // Scroll after a tiny delay
   setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
   }, 0);

  // Store message data including the label used
  const messageData = { senderLabel, message, isAI, AIPP: senderAIPP };
  conversationHistory.push(messageData);
  saveChatHistory(activeChatId, conversationHistory);

  // Update context (q/a) - q is updated before API call, a is updated after
   if (isAI) {
       a = message;
   }
}

function addEmptySpaceIfNeeded() {
  if (!chatMessages || !emptySpace) return;
  // Ensure it's only added once at the very end
  if (!chatMessages.lastElementChild || chatMessages.lastElementChild !== emptySpace) {
       chatMessages.appendChild(emptySpace);
       isEmptySpaceAdded = true;
  }
}

// --- Sending Message & AI Response ---

function handleInputKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
  }
}

function handleSendMessage() {
  if (!inputText || !sendMessageButton) return; // Guard
  const userMessage = inputText.value.trim();

  if (userMessage !== "" && !sendMessageButton.disabled) {
      showLoadingDots(sendMessageButton);
      sendMessageButton.disabled = true;

      appendMessage("User", userMessage, false, AIPP_USER);
      inputText.value = "";

      // --- Prepare for API call ---
      q = userMessage; // Update 'q' context *before* calling generateResponse

      const selectedModelName = localStorage.getItem('model');
      const selectedModel = getModelDetails(selectedModelName);

      if (selectedModel) {
          generateResponse(selectedModel);
      } else {
          console.error("No valid model selected for sending message!");
          appendMessage("System", "Error: No AI model configured.", true, AIPP_ERROR);
          hideLoadingDots(sendMessageButton); // Pass original text implicitly
          sendMessageButton.disabled = false;
      }
  }
}


async function generateResponse(model) {
  const currentChatId = getActiveChatId(); // Get ID at the start of generation
  try {
      let aiResponseText = '';
      const currentHistory = loadChatHistory(currentChatId); // Get fresh history for API context
      const currentDate = new Date().toLocaleDateString(); // Simple date for context

      // --- Choose API based on model config ---
      if (model.api_key === "API_KEY_Text_Bison") {
          // ... (Bison API call logic - simplified example)
          const promptText = model.prompt?.replace('${userMessage}', q).replace('${q}', q).replace('${a}', a).replace('${date}', currentDate) || q; // Fallback to just 'q'
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta3/models/${model.model_name}:generateText?key=${API_KEY_Text_Bison}`, { /* ... body */ });
          if (!response.ok) throw new Error(`Bison API Error: ${response.statusText}`);
          const data = await response.json();
          aiResponseText = data.candidates?.[0]?.output || "No response from Bison.";

      } else if (model.api_key === "API_KEY_Gemini") {
          // ... (Gemini API call logic - simplified example)
           const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
           const modelData = await genAI.getGenerativeModel({ model: model.model_name });
           const generationConfig = model.generation_config;
           const safetySettings = model.safety_settings?.map(setting => ({
               category: HarmCategory[setting.category],
               threshold: HarmBlockThreshold[setting.threshold]
           }));
           const parts = model.prompt_parts?.map(part => ({
               text: part.replace('${userMessage}', q).replace('${q}', q).replace('${a}', a).replace('${date}', currentDate)
           })) || [{ text: q }]; // Fallback

           const result = await modelData.generateContent({ contents: [{ role: "user", parts }], generationConfig, safetySettings });
           aiResponseText = result.response?.text() || "No response from Gemini.";


      } else if (model.api_key === "API_KEY_G/C") {
          // ... (Gemini Chat API logic - requires careful history formatting)
           const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
           const modelZ = genAI.getGenerativeModel({ model: model.model_name, systemInstruction: model.prompt_parts?.join(' ') || "" });
           const generationConfig = model.generation_config;
           const safetySettings = model.safety_settings?.map(setting => ({ category: HarmCategory[setting.category], threshold: HarmBlockThreshold[setting.threshold] }));

            // Format history (exclude last user message 'q', which is sent separately)
            const formattedHistory = currentHistory.slice(0, -1).map(m => ({
                  role: m.isAI ? "model" : "user",
                  parts: [{ text: m.message }]
            }));

           // Add date context if desired by prompt structure
            // formattedHistory.unshift({ role: "user", parts: [{ text: `Date: ${currentDate}`}] }, { role: "model", parts: [{ text: "OK."}] });

           const chatSession = modelZ.startChat({ generationConfig, safetySettings, history: formattedHistory });
           const result = await chatSession.sendMessageStream(q); // Send only the last user message
           for await (const chunk of result.stream) {
               aiResponseText += chunk.text();
           }
           if (!aiResponseText) aiResponseText = "Received empty stream from Gemini Chat.";


      } else if (model.api_key === "API_KEY_Llama") {
          // ... (Groq/Llama API call logic - requires careful history formatting)
           const groq = new Groq({ apiKey: API_KEY_Llama, dangerouslyAllowBrowser: true });
           const messagesForGroq = [
               { role: "system", content: model.prompt_parts?.join(' ') || "You are a helpful assistant." },
               // Add date/context if needed
               // { role: "user", content: `Current date: ${currentDate}` }, { role: "assistant", content: "Noted." },
               // Format history
               ...currentHistory.map(m => ({
                    role: m.isAI ? "assistant" : "user",
                    content: m.message
               }))
               // Note: Groq expects the *full* history including the last user message (q)
           ];

           const chatCompletion = await groq.chat.completions.create({
               messages: messagesForGroq,
               model: model.model_name,
               temperature: model.generation_config?.temperature || 0.7,
               max_tokens: model.generation_config?.max_tokens || 1024,
               top_p: model.generation_config?.top_p || 1,
               stream: model.generation_config?.stream ?? false,
               stop: model.generation_config?.stop
           });

           if (model.generation_config?.stream) {
              for await (const chunk of chatCompletion) {
                  aiResponseText += chunk.choices[0]?.delta?.content || '';
              }
           } else {
              aiResponseText = chatCompletion.choices[0]?.message?.content || "No response from Llama.";
           }
      } else {
           throw new Error(`Unsupported API key type or model configuration error for "${model.label}".`);
      }

      // --- Process Response ---
       // Check if the chat context has changed while waiting for the API
       if (getActiveChatId() !== currentChatId) {
           console.warn("Chat context changed during AI response generation. Discarding response for old chat:", currentChatId);
           // Do not append the message to the now-incorrect chat
       } else {
           // Append AI response to the *correct* (still active) chat
           appendMessage(model.label, aiResponseText, true, model.AIPP || AIPP_DEFAULT_AI);
       }

  } catch (error) {
      console.error("Error during AI response generation:", error);
       // Check context again before showing error in potentially wrong chat
       if (getActiveChatId() === currentChatId) {
          appendMessage(model?.label || "System", `Error: ${error.message}`, true, AIPP_ERROR);
       } else {
           console.warn("Chat context changed before error could be displayed for chat:", currentChatId);
           // Maybe show a general notification instead?
           showNotification(`AI Error in previous chat: ${error.message}`, null, 'error');
       }
  } finally {
       // Check context one last time before re-enabling the button
       if (getActiveChatId() === currentChatId) {
          hideLoadingDots(sendMessageButton);
          sendMessageButton.disabled = false;
       } else {
           console.log("Send button state not reset as context changed.");
           // If the new chat also has the button loading, this might be an issue.
           // A more robust solution might involve request IDs.
           // For now, assume the button state is managed correctly by the new context load.
       }
  }
}

// --- UI Event Handlers & Toggles ---

function toggleMainMenu(forceClose = null) {
  if (!mainMenu) return;
  const isOpen = mainMenu.classList.contains('opened');

  if (forceClose === true || (forceClose === null && isOpen)) {
      // Close main menu and any open sub-menu
      mainMenu.classList.remove('opened');
      if (whichMenuIsOn === "settings") modelWindow?.classList.remove('opened');
      if (whichMenuIsOn === "about") aboutScreen?.classList.remove('opened');
      if (whichMenuIsOn === "changelog") changelogScreen?.classList.remove('opened');
      whichMenuIsOn = null;
  } else if (forceClose === false || (forceClose === null && !isOpen)) {
      // Open main menu
      mainMenu.classList.add('opened');
  }
}

function openSubMenu(element, menuName) {
  if (!element || !mainMenu) return;
   // Close main menu first
   mainMenu.classList.remove('opened');
  // Close any other potentially open sub-menu
  if (whichMenuIsOn === "settings" && menuName !== "settings") modelWindow?.classList.remove('opened');
  if (whichMenuIsOn === "about" && menuName !== "about") aboutScreen?.classList.remove('opened');
  if (whichMenuIsOn === "changelog" && menuName !== "changelog") changelogScreen?.classList.remove('opened');

  // Open the target sub-menu
  element.classList.add('opened');
  whichMenuIsOn = menuName;
}

function closeSubMenu(element) {
   if (!element) return;
  element.classList.remove('opened');
  whichMenuIsOn = null;
}

function handleClearChat() {
   const activeChatId = getActiveChatId();
   const currentHistory = loadChatHistory(activeChatId);

   if (!activeChatId || currentHistory.length === 0) {
        showNotification("Chat is already empty.", null, "info");
        return;
   }

   Swal.fire({
       title: 'Clear Current Chat?',
       text: "This will erase all messages in this chat only. Cannot be undone.",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#e74c3c',
       cancelButtonColor: '#3498db',
       confirmButtonText: 'Yes, clear it!',
       background: '#2c2c2c',
       color: '#ecf0f1'
   }).then((result) => {
       if (result.isConfirmed) {
            if (!chatMessages) return;
           chatMessages.innerHTML = ''; // Clear UI
           isEmptySpaceAdded = false;
           addEmptySpaceIfNeeded();

           conversationHistory = []; // Clear memory
           saveChatHistory(activeChatId, []); // Clear storage

           q = '!'; a = '!'; // Reset context
           showNotification("Chat cleared.", null, "success");
       }
   });
}


// --- Button Loading Animation ---
function showLoadingDots(button) {
  if (!button) return;
  button.classList.add('loading');
  button.dataset.originalText = button.textContent; // Store original text
  button.textContent = ''; // Clear text for dots
}

function hideLoadingDots(button) {
  if (!button) return;
  button.classList.remove('loading');
   // Restore original text if it was saved
   if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
   } else {
       button.textContent = originalSendButtonText; // Fallback
   }
}

// --- Utility (example: initial notification) ---
/*
function handleInitialNotification() {
  const hasSeen = localStorage.getItem('hasSeenNotificationBefore');
  if (!hasSeen) {
       // Assuming imageUrls is defined elsewhere
       // const randomIndex = Math.floor(Math.random() * imageUrls.length);
       // const selectedImage = imageUrls[randomIndex];
       showNotification('Welcome to nAI!', null, 'info'); // Use showNotification tool
       localStorage.setItem('hasSeenNotificationBefore', 'true');
  }
}
*/

// Make sure tools are correctly imported if used, e.g.:
// import { showNotification } from './tools/notification'; // Assuming you have this file
// import { createMessageElement } from './components/message.js'; // Assuming you have this file