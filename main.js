// main.js
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import Groq from 'groq-sdk';
import { showNotification } from './tools/notification';
import { createMessageElement } from './components/message.js';
// Sidebar modülünü ve fonksiyonlarını import et
import { initializeSidebar, getActiveChatId, loadChatHistory, saveChatHistory } from './components/sidebar.js';

// --- API Keys ---
const API_KEY_Gemini = import.meta.env.VITE_API_KEY_Gemini;
const API_KEY_Text_Bison = import.meta.env.VITE_API_KEY_Text_Bison;
const API_KEY_Llama = import.meta.env.VITE_API_KEY_Llama;

// --- UI Elements ---
var mainMenu = document.getElementById("menu-window");
var mainMenuOpenButton = document.getElementById("toggle-menu-button");
var mainMenuCloseButton = document.getElementById("menu-window-close");

var clearButton = document.getElementById("clear-button"); // İşlevi gözden geçirilecek
var sendMessageButton = document.getElementById("send-button");
var chatHeader = document.getElementById("chat-header");

var modelSettingsButton = document.getElementById("settings-button");
var aboutButton = document.getElementById("about-button");
var changelogButton = document.getElementById("changelog-button");
var githubButton = document.getElementById("github-button");

var modelSelector = document.getElementById('model-selector');
var modelWindow = document.getElementById("model-window");
var modelWindowCloseButton = document.getElementById("model-window-close-button");

var aboutScreen = document.getElementById("about-screen");
var aboutScreenCloseButton = document.getElementById("about-screen-close-button");
var changelogScreen = document.getElementById("changelog-screen");
var changelogScreenCloseButton = document.getElementById("changelog-screen-close-button");

var chatMessages = document.getElementById("chat-messages");
var inputText = document.getElementById("input-text"); // input-text elementini al
var originalSendButtonText = sendMessageButton.textContent; // originalText -> originalSendButtonText

// --- State ---
var whichMenuIsOn;
var emptySpace = Object.assign(document.createElement('div'), {
  innerHTML: ' ',
  style: 'height: 14vh;' // Bu boşluk sidebar varken hala gerekli mi? Gözden geçirilebilir.
});
var isEmptySpaceAdded = false; // Bu mantık mesaj yükleme ile değişebilir

// --- Model & Chat Data ---
let conversationHistory = []; // Aktif sohbetin RAM'deki geçmişi
var date = new Date();
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var currentDate = date.getDate() + "/"
              + (date.getMonth()+1) + "/"
              + date.getFullYear() + " - "
              + days[date.getDay()];
var userMessage; // Geçici olarak mesajı tutmak için
var q = `!`; // Son soru
var a = `!`; // Son cevap

var AIPP = "https://static-00.iconduck.com/assets.00/ai-human-icon-256x256-j1bia0vl.png"; // Default AI PP

let models = []; // Modelleri burada tutalım

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
  // Modelleri yükle ve seçiciyi doldur
  fetch('/models.json')
      .then(response => response.json())
      .then(data => {
          models = data;
          populateModelSelector(models);
          // Sidebar'ı başlat ve aktif sohbeti yükle
          // loadAndDisplayChat fonksiyonunu callback olarak veriyoruz
          initializeSidebar(loadAndDisplayChat);
      })
      .catch(error => {
          console.error("Error loading models.json:", error);
          // Modeller yüklenemezse kullanıcıya bilgi verilebilir
          chatHeader.textContent = "Error loading models";
          // Sidebar yine de yüklenebilir ama model seçimi çalışmaz
           initializeSidebar(loadAndDisplayChat);
      });

  // Bildirim mantığı (isteğe bağlı)
  const hasSeenNotificationBefore = localStorage.getItem('hasSeenNotificationBefore');
  /*
  if (hasSeenNotificationBefore == null) {
    const randomIndex = Math.floor(Math.random() * imageUrls.length); // imageUrls tanımlanmalı
    const selectedImage = imageUrls[randomIndex];
    showNotification('Welcome to the nAI!', selectedImage);
    localStorage.setItem('hasSeenNotificationBefore', 'true');
  }
  */
});


// --- Model Selection ---

function getModelDetails(modelName) {
  return models.find(m => m.name === modelName);
}

function populateModelSelector(loadedModels) {
  modelSelector.innerHTML = ''; // Önce temizle
  loadedModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model.name;
      option.text = model.label;
      modelSelector.appendChild(option);
  });

  const storedModel = localStorage.getItem('model');
  if (storedModel && loadedModels.some(m => m.name === storedModel)) {
      modelSelector.value = storedModel;
  } else if (loadedModels.length > 0) {
      // Eğer kayıtlı model yoksa veya geçersizse, ilk modeli seç ve kaydet
      modelSelector.value = loadedModels[0].name;
      localStorage.setItem('model', loadedModels[0].name);
  } else {
       console.warn("No models available to select.");
  }
  updateChatHeaderWithModel(); // Başlangıçta başlığı güncelle
}

// Model seçici değiştiğinde SADECE localStorage'ı güncelle
modelSelector.addEventListener('change', function () {
  const selectedModel = modelSelector.value;
  localStorage.setItem('model', selectedModel);
  updateChatHeaderWithModel(); // Başlığı da anında güncelle (isteğe bağlı)
  // DİKKAT: Aktif sohbetin geçmişi veya API çağrısı burada DEĞİŞTİRİLMEZ.
  // Değişiklik sadece bir sonraki 'Send' tıklandığında etkili olur.
});

function updateChatHeaderWithModel() {
  const selectedModelName = localStorage.getItem('model');
  const model = getModelDetails(selectedModelName);
  chatHeader.textContent = model ? model.label : 'nAI'; // Başlığı güncelle
}


// --- Chat Loading and Display ---

/**
* Loads history for the given chatId from localStorage,
* updates the conversationHistory array, and renders messages.
* @param {string} chatId The ID of the chat to load.
*/
function loadAndDisplayChat(chatId) {
  console.log("Loading chat:", chatId);
  if (!chatId) {
      console.warn("loadAndDisplayChat called with null chatId.");
      chatMessages.innerHTML = ''; // Clear messages area
      conversationHistory = []; // Clear memory history
      // İsteğe bağlı: Kullanıcıya bir mesaj gösterilebilir.
      return;
  }

  // 1. Load history from localStorage using sidebar helper
  conversationHistory = loadChatHistory(chatId);
  console.log("Loaded history:", conversationHistory);

  // 2. Clear the current display
  chatMessages.innerHTML = '';
  isEmptySpaceAdded = false; // Reset flag

  // 3. Render messages from the loaded history
  conversationHistory.forEach(msg => {
      // `appendMessage`'i çağırmak yerine doğrudan DOM'a ekleyelim
      // çünkü `appendMessage` history'ye tekrar eklemeye çalışır.
      // AIPP bilgisi history'de saklanmalı! (Sonraki adımda ekleyeceğiz)
      const messageElement = createMessageElement(msg.sender, msg.message, msg.isAI, msg.AIPP || AIPP); // AIPP'yi history'den al veya default kullan
      chatMessages.appendChild(messageElement);
  });

  // 4. Scroll to bottom (veya son mesaja)
  addEmptySpaceIfNeeded(); // Boşluğu ekle
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // 5. Update chat header (isteğe bağlı, model her zaman globalden okunuyor)
  updateChatHeaderWithModel();

  // 6. Clear q and a context for the new chat (important!)
  q = '!';
  a = '!';
}

// --- Message Handling ---

/**
* Appends a message to the UI and saves it to the active chat's history.
* @param {string} sender - "User" or AI model label.
* @param {string} message - The message content.
* @param {boolean} isAI - True if the message is from the AI.
* @param {string} senderAIPP - The profile picture URL for the sender.
*/
function appendMessage(sender, message, isAI, senderAIPP) {
  const activeChatId = getActiveChatId(); // Get current active chat ID
  if (!activeChatId) {
      console.error("Cannot append message, no active chat!");
      // Kullanıcıya hata gösterilebilir
      return;
  }

  // 1. Create message element and add to UI
  const messageElement = createMessageElement(sender, message, isAI, senderAIPP);

  if (isEmptySpaceAdded) {
      chatMessages.removeChild(emptySpace);
  }
  chatMessages.appendChild(messageElement);
  addEmptySpaceIfNeeded(); // Boşluğu tekrar ekle
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // 2. Add message to in-memory history
  const messageData = { sender, message, isAI, AIPP: senderAIPP }; // AIPP'yi de kaydet
  conversationHistory.push(messageData);

  // 3. Save updated history to localStorage for the *active* chat
  saveChatHistory(activeChatId, conversationHistory);

  // 4. Update q and a context if it's an AI response
  // (Kullanıcı mesajı için 'q' generateResponse içinde güncelleniyor)
  if (isAI) {
      a = message; // 'a' (answer) güncelleniyor
  }
   // 'q' (question) generateResponse çağrılmadan hemen önce güncellenecek
}

function addEmptySpaceIfNeeded() {
  // chatMessages'in son elemanı boşluk değilse ekle
   if (!chatMessages.lastElementChild || chatMessages.lastElementChild !== emptySpace) {
       chatMessages.appendChild(emptySpace);
       isEmptySpaceAdded = true;
   }
}

// --- Sending Message & AI Response ---

sendMessageButton.onclick = () => {
  userMessage = inputText.value.trim(); // Global değişkene ata
  if (userMessage !== "") {
      showLoadingDots(sendMessageButton);
      sendMessageButton.disabled = true;

      // Kullanıcı mesajını ekle (appendMessage artık kaydı da yapıyor)
      appendMessage("User", userMessage, false, "https://images.vexels.com/media/users/3/137047/isolated/lists/5831a17a290077c646a48c4db78a81bb-user-profile-blue-icon.png"); // User PP
      inputText.value = "";

      // Seçili modeli localStorage'dan al
      const selectedModelName = localStorage.getItem('model');
      const selectedModel = getModelDetails(selectedModelName);

      if (selectedModel) {
          // Son kullanıcı mesajını 'q' olarak ayarla
          q = userMessage;
          generateResponse(selectedModel);
      } else {
          console.error("No valid model selected!");
          appendMessage("System", "Error: No valid AI model selected. Please check settings.", true, "https://i.imgur.com/2Rs5ya9.png");
          hideLoadingDots(sendMessageButton, originalSendButtonText);
          sendMessageButton.disabled = false;
      }
  }
};

inputText.addEventListener('keydown', function(event) { // input-text'e event listener ekle
  if (event.key === 'Enter' && !event.shiftKey) { // Shift+Enter hariç
      event.preventDefault(); // Form submitini veya yeni satırı engelle
      sendMessageButton.click();
  }
});

// generateResponse fonksiyonu artık 'originalText' parametresine ihtiyaç duymaz
async function generateResponse(model) {
  try {
      let aiResponseText = '';
      // Use conversationHistory which is already updated for the active chat
      // Make sure q and a are correctly set before calling the API

      if (model.api_key === "API_KEY_Text_Bison") {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta3/models/${model.model_name}:generateText?key=${API_KEY_Text_Bison}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  'prompt': { 'text': model.prompt.replace('${userMessage}', q).replace('${q}', q).replace('${a}', a).replace('${date}', currentDate) }, // userMessage yerine q kullan
                  'temperature': model.generation_config.temperature || 0.7,
                  'top_k': model.generation_config.top_k || 40,
                  'top_p': model.generation_config.top_p || 0.95,
                  'candidate_count': 1,
                  'max_output_tokens': model.generation_config.max_output_tokens || 1024,
                  'stop_sequences': model.generation_config.stop_sequences || [],
                  'safety_settings': model.safety_settings || [
                      { 'category': 'HARM_CATEGORY_DEROGATORY', 'threshold': 4 },
                      { 'category': 'HARM_CATEGORY_TOXICITY', 'threshold': 4 },
                      { 'category': 'HARM_CATEGORY_VIOLENCE', 'threshold': 4 }
                  ]
              })
          });
           if (!response.ok) throw new Error(`Bison API Error: ${response.statusText}`);
          const data = await response.json();
          aiResponseText = data.candidates[0].output;

      } else if (model.api_key === "API_KEY_Gemini") {
          const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
          const modelData = await genAI.getGenerativeModel({ model: model.model_name });

          const generationConfig = model.generation_config;
          const safetySettings = model.safety_settings.map(setting => ({
              category: HarmCategory[setting.category],
              threshold: HarmBlockThreshold[setting.threshold]
          }));

          // Prompt'u hazırla (q, a, date yerine koy)
          const parts = model.prompt_parts.map(part => ({
              text: part.replace('${userMessage}', q) // userMessage yerine q
                       .replace('${q}', q)
                       .replace('${a}', a)
                       .replace('${date}', currentDate)
          }));

          const result = await modelData.generateContent({
              contents: [{ role: "user", parts }],
              generationConfig,
              safetySettings,
          });

          const response = result.response;
           if (!response) throw new Error("Gemini API Error: No response generated.");
          aiResponseText = response.text();

      } else if (model.api_key === "API_KEY_G/C") {
           const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
           const modelZ = genAI.getGenerativeModel({
               model: model.model_name,
               systemInstruction: model.prompt_parts.join(' ').replace('${date}', currentDate).replace('${q}', q).replace('${a}', a), // Sistem talimatına context ekle
           });

           const generationConfig = model.generation_config;

           // Format conversation history for Gemini Chat
           const formattedHistory = conversationHistory.slice(0, -1) // Exclude the last user message (it's the prompt)
               .map(message => ({
                   role: message.isAI ? "model" : "user",
                   parts: [{ text: message.message }],
               }));

            // Add date context explicitly if needed by the model/prompt structure
            formattedHistory.unshift(
                { role: "user", parts: [{ text: "What is it today (Date/Month/Year - Day)?" }] },
                { role: "model", parts: [{ text: currentDate }] }
            );

           const chatSession = modelZ.startChat({
               generationConfig,
               history: formattedHistory,
           });

           const result = await chatSession.sendMessageStream(q); // Send last user message (q)
           for await (const chunk of result.stream) {
               const content = chunk.text();
               aiResponseText += content;
           }
           if (!aiResponseText) throw new Error("Gemini Chat API Error: Empty response stream.");


      } else if (model.api_key === "API_KEY_Llama") {
          const groq = new Groq({ apiKey: API_KEY_Llama, dangerouslyAllowBrowser: true });

           // Format conversation history for Groq
           const messagesForGroq = [
               {
                   "role": "system",
                   "content": model.prompt_parts.join(' ').replace('${date}', currentDate).replace('${q}', q).replace('${a}', a) // Sistem talimatı
               },
                // Add date context explicitly
               { role: "user", content: "What is it today (Date/Month/Year - Day)?" },
               { role: "assistant", content: currentDate },
                // Add actual conversation history
               ...conversationHistory.slice(0, -1) // Exclude the last user message (q)
                   .map(message => ({
                       role: message.isAI ? "assistant" : "user",
                       content: message.message,
                   })),
               // Add the last user message (q)
                {
                    "role": "user",
                    "content": q
                }
           ];

          const chatCompletion = await groq.chat.completions.create({
              messages: messagesForGroq,
              model: model.model_name,
              temperature: model.generation_config.temperature,
              max_tokens: model.generation_config.max_tokens,
              top_p: model.generation_config.top_p,
              stream: model.generation_config.stream ?? false, // stream default false olsun
              stop: model.generation_config.stop
          });

           if (model.generation_config.stream) {
               for await (const chunk of chatCompletion) {
                  aiResponseText += chunk.choices[0]?.delta?.content || '';
               }
           } else {
               aiResponseText = chatCompletion.choices[0]?.message?.content || '';
           }
            if (!aiResponseText) throw new Error("Llama/Groq API Error: Empty response.");

      } else {
           throw new Error(`Unsupported API key type: ${model.api_key}`);
      }

      // AI cevabını ekle (appendMessage kaydı da yapıyor)
      appendMessage(model.label, aiResponseText, true, model.AIPP || AIPP);

  } catch (error) {
      console.error("Error during API call:", error);
      appendMessage(model?.label || "System", `Error generating response: ${error.message}`, true, "https://i.imgur.com/2Rs5ya9.png");
  } finally {
      hideLoadingDots(sendMessageButton, originalSendButtonText); // Orijinal metni geri yükle
      sendMessageButton.disabled = false;
  }
}


// --- UI Event Handlers ---

modelSettingsButton.onclick = () => {
  mainMenu.classList.toggle("opened");
  modelWindow.classList.toggle('opened');
  whichMenuIsOn = modelWindow.classList.contains('opened') ? "settings" : null;
};

modelWindowCloseButton.onclick = () => {
  modelWindow.classList.remove('opened'); // Toggle yerine remove
  // Menü açık kalmalı mı? Eğer evetse aşağıdaki satırı kaldır.
  // mainMenu.classList.remove("opened");
  whichMenuIsOn = null;
};

aboutButton.onclick = () => {
  mainMenu.classList.toggle("opened");
  aboutScreen.classList.toggle('opened');
   whichMenuIsOn = aboutScreen.classList.contains('opened') ? "about" : null;
};

aboutScreenCloseButton.onclick = () => {
  aboutScreen.classList.remove('opened');
  // mainMenu.classList.remove("opened");
  whichMenuIsOn = null;
};

changelogButton.onclick = () => {
  mainMenu.classList.toggle("opened");
  changelogScreen.classList.toggle('opened');
   whichMenuIsOn = changelogScreen.classList.contains('opened') ? "changelog" : null;
};

changelogScreenCloseButton.onclick = () => {
  changelogScreen.classList.remove('opened');
  // mainMenu.classList.remove("opened");
  whichMenuIsOn = null;
};

mainMenuOpenButton.onclick = () => {
  // Eğer alt menülerden biri açıksa, sadece ana menüyü kapat/aç
  if (whichMenuIsOn === "settings") modelWindow.classList.remove('opened');
  if (whichMenuIsOn === "about") aboutScreen.classList.remove('opened');
  if (whichMenuIsOn === "changelog") changelogScreen.classList.remove('opened');

  mainMenu.classList.toggle("opened");
  whichMenuIsOn = null; // Alt menü kapandığı için sıfırla
};

mainMenuCloseButton.onclick = () => {
  mainMenu.classList.remove("opened"); // Toggle yerine remove
   // Açık olan alt menüyü de kapat
   if (whichMenuIsOn === "settings") modelWindow.classList.remove('opened');
   if (whichMenuIsOn === "about") aboutScreen.classList.remove('opened');
   if (whichMenuIsOn === "changelog") changelogScreen.classList.remove('opened');
   whichMenuIsOn = null;
};

// Clear button'un yeni işlevi: Aktif sohbeti temizle
clearButton.onclick = () => {
   const activeChatId = getActiveChatId();
   const activeChat = loadChatHistory(activeChatId); // Mevcut geçmişi al (aslında sadece kontrol için)

   if (!activeChatId || activeChat.length === 0) {
       // Zaten boşsa bir şey yapma veya kullanıcıya bildir
       showNotification("Chat is already empty.", null, "info"); // toastr varsayılıyor
       return;
   }

   Swal.fire({
       title: 'Clear Chat?',
       text: "Are you sure you want to clear all messages in this chat? This cannot be undone.",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#d33',
       cancelButtonColor: '#3085d6',
       confirmButtonText: 'Yes, clear it!',
       background: '#111',
       color: '#ecf0f1'
   }).then((result) => {
       if (result.isConfirmed) {
           // 1. Clear UI
           chatMessages.innerHTML = '';
           isEmptySpaceAdded = false;
           addEmptySpaceIfNeeded(); // Boşluğu ekle

           // 2. Clear in-memory history
           conversationHistory = [];

           // 3. Clear localStorage for this chat
           saveChatHistory(activeChatId, []); // Boş array kaydet

           // 4. Reset context variables
           q = '!';
           a = '!';

           showNotification("Chat cleared.", null, "success");
       }
   });
};


githubButton.onclick = () => {
  window.open('https://github.com/mehmetabak/nAI', '_blank'); // Yeni sekmede aç
};

// --- Button Animation ---
function showLoadingDots(button) {
  button.classList.add('loading');
   button.textContent = ''; // Metni temizle
}

function hideLoadingDots(button, originalText) {
  button.classList.remove('loading');
   button.textContent = originalText; // Orijinal metni geri yükle
}

// --- Gerekirse diğer fonksiyonlar ---
// (örneğin, imageUrls dizisi yukarıda tanımlanmalı)
const imageUrls = [
'https://i.pinimg.com/736x/3f/f8/6a/3ff86a79ba1d1caabce0626d3417c47a.jpg',
'https://i.pinimg.com/736x/ee/f6/ee/eef6ee16e6a29b15148ff075cf4c024c.jpg',
'https://i.pinimg.com/564x/a0/bb/d5/a0bbd5abb5c314105df8034ec350a8b6.jpg',
'https://i.pinimg.com/564x/c8/b1/83/c8b183a76478e8832e386e55134acba8.jpg',
'https://i.pinimg.com/564x/b9/5a/cb/b95acbb938a23eb7c480256685b5b528.jpg'
];