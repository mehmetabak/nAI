import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } from "@google/generative-ai";
import { showNotification } from './tools/notification';

const API_KEY_Gemini = import.meta.env.API_KEY_Gemini;
const API_KEY_Text_Bison = import.meta.env.API_KEY_Text_Bison;

// UI
var open = document.getElementById("toggle-menu-button");
var clear = document.getElementById("clean-button");
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

document.addEventListener('DOMContentLoaded', () => {
  const hasSeenNotification = localStorage.getItem('hasSeenNotification');
  const randomIndex = Math.floor(Math.random() * imageUrls.length);
  const selectedImage = imageUrls[randomIndex];

  if (hasSeenNotification == null) {
    showNotification('Yeni yapay zeka modeli DASHSJHSAK yani Asaf herkese kullanıma açıldı, hadi ayarlardan seç ve test et!', selectedImage);
    localStorage.setItem('hasSeenNotification', 'true');
  }
});

//Model Check and Update
function getModelLabel(modelName) {
  const model = models.find(m => m.name === modelName);
  return model ? model.label : 'nAI';
}

function populateModelSelector(models) {
    models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.name;
    option.text = model.label;
    modelSelector.appendChild(option);
  });
  
  if(localStorage.getItem('model') !== null){
    modelSelector.value = localStorage.getItem('model');
    header.firstChild.data = getModelLabel(modelSelector.value);
  } else {
    modelSelector.value = models[0].name;
    header.firstChild.data = models[0].label;
  }
}

let models;

fetch('/models.json')
  .then(response => response.json())
  .then(data => {
    models = data;
    populateModelSelector(models);
  });

//Base UI functions
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
};

clear.onclick= () => {
  window.location.reload();
}

//Other UI functions
modelSelector.addEventListener('change', function () {
  const selectedModel = modelSelector.value;
  localStorage.setItem('model', selectedModel);
  header.firstChild.data = getModelLabel(selectedModel);
});

send.onclick= () => {
  const inputText = document.getElementById("input-text");
  userMessage = inputText.value.trim();
  var selectedModelName = localStorage.getItem('model');
  var selectedModel = models.find(m => m.name === selectedModelName);

  if (userMessage !== "") {
    appendMessage("User", userMessage);
    inputText.value = "";
    scrollToBottom();
    if (selectedModel) {
      generateResponse(selectedModel);
    } else {
      generateResponse(models[0]); // Default model
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

//Functions for ML and Messaging
function scrollToBottom() {
  const chatMessages = document.getElementById("chat-messages");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendMessage(sender, message) {
  const chatMessages = document.getElementById("chat-messages");
  const messageElement = document.createElement("div");
  messageElement.className = sender.toLowerCase() + "-message";
  if(sender == "AlpGTR" || sender == "DASHSJHSAK" || sender == "nAI") {
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
async function generateResponse(model) {
  if (model.api_key === "API_KEY_Text_Bison") {
    // Text Bison API call
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta3/models/${model.model_name}:generateText?key=${API_KEY_Text_Bison}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'prompt': { 'text': model.prompt.replace('${userMessage}', userMessage).replace('${q}', q).replace('${a}', a) },
        'temperature': 0.7,
        'top_k': 40,
        'top_p': 0.95,
        'candidate_count': 1,
        'max_output_tokens': 1024,
        'stop_sequences': [],
        'safety_settings': [
          { 'category': 'HARM_CATEGORY_DEROGATORY', 'threshold': 4 },
          { 'category': 'HARM_CATEGORY_TOXICITY', 'threshold': 4 },
          { 'category': 'HARM_CATEGORY_VIOLENCE', 'threshold': 4 }
        ]
      })
    });

    const data = await response.json();
    q = userMessage;
    a = data.candidates[0].output;
    appendMessage(model.label, a);
    scrollToBottom();
  } else if(model.api_key === "API_KEY_Gemini"){
    // Google Generative AI API call
    const genAI = new GoogleGenerativeAI({ API_KEY_Gemini });
    const modelData = await genAI.getGenerativeModel({ model: model.model_name });

    const generationConfig = {
      temperature: model.generation_config.temperature,
      topK: model.generation_config.topK,
      topP: model.generation_config.topP,
      maxOutputTokens: model.generation_config.maxOutputTokens,
    };

    const safetySettings = model.safety_settings.map(setting => ({
      category: HarmCategory[setting.category],
      threshold: HarmBlockThreshold[setting.threshold]
    }));

    const parts = model.prompt_parts.map(part => ({
      text: part.replace('${userMessage}', userMessage)
    }));

    parts.forEach(part => {
      part.text = part.text.replace('${q}', q).replace('${a}', a);
    });

    const result = await modelData.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    q = userMessage;
    a = response.text();
    appendMessage(model.label, a);
    scrollToBottom();
  }
}

// First Main Model
function oldGTR() {
  if (userMessage !== "") {
      fetch(`https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText?key=${API_KEY_Text_Bison}`, {
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
          appendMessage("AlpGTR", data.candidates[0].output);
          scrollToBottom();
      });
  }
}

