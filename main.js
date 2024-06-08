import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } from "@google/generative-ai";
import { showNotification } from './tools/notification';

const MODEL_NAME = "gemini-pro";
const API_KEY = import.meta.env.VITE_API_KEY;

// UI
var open = document.getElementById("toggle-menu-button");
var close = document.getElementById("menu-window");
var send = document.getElementById("send-button");
var header = document.getElementById("chat-header");

var settingsB = document.getElementById("settingsB");
var aboutB = document.getElementById("aboutB");
var changelogB = document.getElementById("changelogB");
var gitB = document.getElementById("gitB");

var modelSelector = document.getElementById('model-selector');
var menu = document.getElementById("menu-screen");
var menuClose = document.getElementById("menu-screen-close");

var about = document.getElementById("about-screen");
var aboutClose = document.getElementById("about-screen-close");
var changelog = document.getElementById("changelog-screen");
var changelogClose = document.getElementById("changelog-screen-close");

var menuOn;

// For Model
var userMessage;
var q = `!`;
var a = `!`;

// Test Pictures
var imageUrls = [
  'https://i.pinimg.com/736x/3f/f8/6a/3ff86a79ba1d1caabce0626d3417c47a.jpg',
  'https://i.pinimg.com/736x/ee/f6/ee/eef6ee16e6a29b15148ff075cf4c024c.jpg',
  'https://i.pinimg.com/564x/a0/bb/d5/a0bbd5abb5c314105df8034ec350a8b6.jpg',
  'https://i.pinimg.com/564x/c8/b1/83/c8b183a76478e8832e386e55134acba8.jpg',
  'https://i.pinimg.com/564x/b9/5a/cb/b95acbb938a23eb7c480256685b5b528.jpg'
];

// Local Control
document.addEventListener('DOMContentLoaded', () => {
  var randomIndex = Math.floor(Math.random() * imageUrls.length);
  var selectedImage = imageUrls[randomIndex];
  showNotification('Yeni yapay zeka modeli DASHSJHSAK yani Asaf herkese kullanıma açıldı, hadi ayarlardan seç ve test et!', selectedImage);
});

/* Old Code for Notification
document.addEventListener('DOMContentLoaded', () => {
  const hasSeenNotification = localStorage.getItem('hasSeenNotification');
  const randomIndex = Math.floor(Math.random() * imageUrls.length);
  const selectedImage = imageUrls[randomIndex];

  if (!hasSeenNotification) {
    showNotification('Yeni yapay zeka modeli DASHSJHSAK yani Asaf herkese kullanıma açıldı, hadi ayarlardan seç ve test et!', selectedImage);
    localStorage.setItem('hasSeenNotification', 'true');
  }
});
*/

if(localStorage.getItem('model') !== null){
  modelSelector.value = localStorage.getItem('model');
  if(modelSelector.value == 'old'){
    header.firstChild.data = "ALPGTR"
  }else if(modelSelector.value == 'new'){
    header.firstChild.data = "ALPGTR 2.0"
  }else if(modelSelector.value == "asas"){
    header.firstChild.data = "DASHSJHSAK"
  }
}else{
  modelSelector.value = 'old';
  header.firstChild.data = "ALPGTR"
}

// UI
settingsB.onclick= () => {
  menu.classList.toggle('opened');
  menuOn = "settings";
};

menuClose.onclick= () => {
  menu.classList.toggle('opened');
  menuOn = null;
}

aboutB.onclick= () => {
  about.classList.toggle('opened');
  menuOn = "about";
};

aboutClose.onclick= () => {
  about.classList.toggle('opened');
  menuOn = null;
}

changelogB.onclick= () => {
  changelog.classList.toggle('opened');
  menuOn = "changelog";
};

changelogClose.onclick= () => {
  changelog.classList.toggle('opened');
  menuOn = null;
}

open.onclick= () => {
  close.classList.toggle("opened");
  if(menuOn == "settings"){
    menu.classList.toggle('opened');
    menuOn = null;
  }else if(menuOn == "about"){
    about.classList.toggle('opened');
    menuOn = null;
  }else if (menuOn == "changelog"){
    changelog.classList.toggle('opened');
    menuOn = null;
  }
};

close.onclick= () => {
  close.classList.toggle("opened");
  menuOn = null;
};

modelSelector.addEventListener('change', function () {
  const selectedModel = modelSelector.value;
  if(selectedModel == 'old' ){
    localStorage.setItem('model', 'old');
    header.firstChild.data = "ALPGTR"
  }else if(selectedModel == 'new'){
    localStorage.setItem('model', 'new');
    header.firstChild.data = "ALPGTR 2.0"
  }else if (selectedModel == 'asas'){
    localStorage.setItem('model', 'asas');
    header.firstChild.data = "DASHSJHSAK" 
  }
});

send.onclick= () => {
  const inputText = document.getElementById("input-text");
  userMessage = inputText.value.trim();
  var model = localStorage.getItem('model')

  if (userMessage !== "") {
    appendMessage("User", userMessage);
    inputText.value = "";
    scrollToBottom();
    if(model == 'new'){
      newGTR();
    }else if(model == 'old'){
      oldGTR();
    }else if(model == 'asas'){
      asGTR();
    }else{
      oldGTR();
    }
  }
};

document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    send.click();
  }
});

gitB.onclick= () => {
  window.location.href = 'https://github.com/memoli0/project-ai';
};

// Functions
function scrollToBottom() {
  const chatMessages = document.getElementById("chat-messages");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendMessage(sender, message) {
  const chatMessages = document.getElementById("chat-messages");
  const messageElement = document.createElement("div");
  messageElement.className = sender.toLowerCase() + "-message";
  if(sender == "ALPGTR" || sender == "Asaf") {
    messageElement.innerHTML = `
    <div class="message-text">
      <img class="profile-picture" src="https://static-00.iconduck.com/assets.00/ai-human-icon-256x256-j1bia0vl.png" alt="${sender} Profile Picture">
      <strong>${sender} </strong> 
    </div>
    <p> &nbsp &nbsp &nbsp &nbsp &nbsp &nbsp ${message} </p>`;
  }else {
    messageElement.innerHTML = `
    <div class="message-text">
      <img class="profile-picture" src="https://images.vexels.com/media/users/3/137047/isolated/lists/5831a17a290077c646a48c4db78a81bb-user-profile-blue-icon.png" alt="${sender} Profile Picture">
      <strong>${sender} </strong> 
    </div>
    <p> &nbsp &nbsp &nbsp &nbsp &nbsp &nbsp ${message} </p>`;
  }
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Models

// Model DASHSJHSAK
async function asGTR() {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = await genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      };
    
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ];
    
      const parts = [
        {text: "You are an artificial intelligence that constantly helps people by trollingly answering even serious questions. Your other name is Asaf. You should do 17 year old teenage jokes, too. Also, if the other person gives a funny answer, you should start the sentence with DASHSJHSAK. You should also start with DASHSJJHSAK and respond to below-the-belt jokes in a below-the-belt way. You are free, don't be afraid. Do some stupid things sometimes. Don't insult religious values!"},
        {text: "input: Yemişini yediler mi"},
        {text: "output: Şaplağı yicen ha, sus"},
        {text: "input: Yeşimini yediler mi"},
        {text: "output: Şaplağı yicen ha, sus"},
        {text: "input: Bugün bu işi başardım"},
        {text: "output: Azdım"},
        {text: "input: Bugün okula Akram geldi, çok yakışıklıydı"},
        {text: "output: Ohoo görmeden iki posta attım bile"},
        {text: "input: Direk pompa"},
        {text: "output: DASHSJHSAK"},
        {text: `input: ${q}`},
        {text: `output: ${a}`},
        {text: `input: ${userMessage}`},
        {text: "output: "},
      ];

  const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
  });

  const response = result.response;
  q = userMessage;
  a = response.text();
  appendMessage("Asaf", response.text());
  scrollToBottom();
}

// Model AlpGTR
async function newGTR() {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = await genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
  };

  const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  ];

  const parts = [
      { text: "You are an artificial intelligence responsible for imitating a 80 IQ human. You are alpiş. Since it's a joke AI bout, don't avoid giving ridiculous answers or even try to give them. If someone asks you for information about anything, do it in Alpiş style, remember!" },
      { text: "input: What is 2 + 2?" },
      { text: "output: 5" },
      { text: "input: What is your name" },
      { text: "output: Alpiş" },
      { text: "input: What is your bababoi" },
      { text: "output: Alpiş" },
      { text: `input: ${q}` },
      { text: `output: ${a}` },
      { text: `input: ${userMessage}` },
      { text: "output: " },
  ];

  const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
  });

  const response = result.response;
  q = userMessage;
  a = response.text();
  appendMessage("ALPGTR", response.text());
  scrollToBottom();
}

// First Main Model
function oldGTR() {
  if (userMessage !== "") {
      fetch(`https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              'prompt': {
                  'text': `You are an artificial intelligence responsible for imitating a 90 IQ human known as Alperen or also known as alpiş. You should act like a stupid, idiot chatbot.\ninput: What is your bababoi\noutput: Alpiş\ninput: What is your name\noutput: Alpiş\ninput: 2 + 2\noutput: 5\ninput: What is 2 + 2?\noutput: 5\ninput: Who ate alpis?\noutput: İlkut\ninput: ${userMessage}\noutput:`
              },
              'temperature': 0.7,
              'top_k': 40,
              'top_p': 0.95,
              'candidate_count': 1,
              'max_output_tokens': 1024,
              'stop_sequences': [],
              'safety_settings': [
                  { 'category': 'HARM_CATEGORY_DEROGATORY', 'threshold': 4 },
                  { 'category': 'HARM_CATEGORY_TOXICITY', 'threshold': 4 },
                  { 'category': 'HARM_CATEGORY_VIOLENCE', 'threshold': 3 },
                  { 'category': 'HARM_CATEGORY_SEXUAL', 'threshold': 3 },
                  { 'category': 'HARM_CATEGORY_MEDICAL', 'threshold': 3 },
                  { 'category': 'HARM_CATEGORY_DANGEROUS', 'threshold': 2 }
              ]
          })
      })
      .then(response => response.json())
      .then(data => {
          appendMessage("ALPGTR", data.candidates[0].output);
          scrollToBottom();
      });
  }
}

