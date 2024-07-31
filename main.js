import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } from "@google/generative-ai";
import Groq from 'groq-sdk';
import { showNotification } from './tools/notification';
import { createMessageElement } from './components/message.js';

const API_KEY_Gemini = import.meta.env.VITE_API_KEY_Gemini;
const API_KEY_Text_Bison = import.meta.env.VITE_API_KEY_Text_Bison;
const API_KEY_Llama = import.meta.env.VITE_API_KEY_Llama

// UI
var mainMenu = document.getElementById("menu-window");
var mainMenuOpenButton = document.getElementById("toggle-menu-button");
var mainMenuCloseButton = document.getElementById("menu-window-close")

var clearButton = document.getElementById("clear-button");
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

var originalText = sendMessageButton.textContent;

var whichMenuIsOn;
var emptySpace = Object.assign(document.createElement('div'), {
  innerHTML: '&nbsp;',
  style: 'height: 14vh;'
});
var isEmptySpaceAdded = false;

// For Model
let conversationHistory = [];
var date = new Date(); 
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var currentDate = date.getDate() + "/"
                + (date.getMonth()+1) + "/" 
                + date.getFullYear() + " - "
                + days[date.getDay()];
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
  const hasSeenNotificationBefore = localStorage.getItem('hasSeenNotificationBefore');
  const randomIndex = Math.floor(Math.random() * imageUrls.length);
  const selectedImage = imageUrls[randomIndex];

  if (hasSeenNotificationBefore == null) {
    showNotification('Welcome to the nAI!', selectedImage);
    localStorage.setItem('hasSeenNotificationBefore', 'true');
  }
});

//Model Selection and Update
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
    chatHeader.firstChild.data = getModelLabel(modelSelector.value);
  } else {
    modelSelector.value = models[0].name;
    localStorage.setItem('model', models[0].name);
    chatHeader.firstChild.data = models[0].label;
  }
}

let models;

fetch('/models.json')
  .then(response => response.json())
  .then(data => {
    models = data;
    populateModelSelector(models);
  });

modelSelector.addEventListener('change', function () {
  const selectedModel = modelSelector.value;
  localStorage.setItem('model', selectedModel);
  chatHeader.firstChild.data = getModelLabel(selectedModel);
});

//Base UI functions
modelSettingsButton.onclick= () => {
  mainMenu.classList.toggle("opened");
  modelWindow.classList.toggle('opened');
  whichMenuIsOn = "settings";
};

modelWindowCloseButton.onclick= () => {
  mainMenu.classList.toggle("opened");
  modelWindow.classList.toggle('opened');
  whichMenuIsOn = null;
}

aboutButton.onclick= () => {
  mainMenu.classList.toggle("opened");
  aboutScreen.classList.toggle('opened');
  whichMenuIsOn = "about";
};

aboutScreenCloseButton.onclick= () => {
  mainMenu.classList.toggle("opened");
  aboutScreen.classList.toggle('opened');
  whichMenuIsOn = null;
}

changelogButton.onclick= () => {
  mainMenu.classList.toggle("opened");
  changelogScreen.classList.toggle('opened');
  whichMenuIsOn = "changelog";
};

changelogScreenCloseButton.onclick= () => {
  mainMenu.classList.toggle("opened");
  changelogScreen.classList.toggle('opened');
  whichMenuIsOn = null;
}

mainMenuOpenButton.onclick= () => {
  mainMenu.classList.toggle("opened");
  if(whichMenuIsOn == "settings"){
    modelWindow.classList.toggle('opened');
    whichMenuIsOn = null;
  }else if(whichMenuIsOn == "about"){
    aboutScreen.classList.toggle('opened');
    whichMenuIsOn = null;
  }else if (whichMenuIsOn == "changelog"){
    changelogScreen.classList.toggle('opened');
    whichMenuIsOn = null;
  }
};

mainMenuCloseButton.onclick= () => {
  mainMenu.classList.toggle("opened");
};

clearButton.onclick= () => {
  window.location.reload();
}

githubButton.onclick= () => {
  window.location.href = 'https://github.com/mehmetabak/nAI';
};

sendMessageButton.onclick= () => {
  const inputText = document.getElementById("input-text");
  userMessage = inputText.value.trim();
  if (userMessage !== "") {
    showLoadingDots(sendMessageButton);
    sendMessageButton.disabled = true;
    conversationHistory.push({ role: "user", content: userMessage });
    var selectedModel = models.find(m => m.name === localStorage.getItem('model'));
    appendMessage("User", userMessage, false);
    inputText.value = "";
    if (selectedModel) {
      generateResponse(selectedModel, originalText);
    } else {
      generateResponse(models[0], originalText); // Default model
    }
  }
};

document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    sendMessageButton.click();
  }
});

function appendMessage(sender, message, isAI) {
  if(!isEmptySpaceAdded){
    chatMessages.appendChild(createMessageElement(sender, message, isAI));
    chatMessages.appendChild(emptySpace);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    isEmptySpaceAdded = true;
  }else{
    chatMessages.removeChild(emptySpace);
    chatMessages.appendChild(createMessageElement(sender, message, isAI));
    chatMessages.appendChild(emptySpace);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// Models
async function generateResponse(model, originalText) {
  try {
    if (model.api_key === "API_KEY_Text_Bison") {
      // Text Bison API call
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta3/models/${model.model_name}:generateText?key=${API_KEY_Text_Bison}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'prompt': { 'text': model.prompt.replace('${userMessage}', userMessage).replace('${q}', q).replace('${a}', a).replace('${date}', currentDate) },
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
      conversationHistory.push({ role: "assistant", content: a });
      appendMessage(model.label, a, true);
    } else if (model.api_key === "API_KEY_Gemini") {
      // Google Generative AI API call
      const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
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
        part.text = part.text.replace('${q}', q).replace('${a}', a).replace('${date}', currentDate);
      });

      const result = await modelData.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig,
        safetySettings,
      });

      const response = result.response;
      q = userMessage;
      a = response.text();
      conversationHistory.push({ role: "assistant", content: a });
      appendMessage(model.label, a, true);
    }else if(model.api_key === "API_KEY_Llama"){
      // Llama API call
      const groq = new Groq({ apiKey:API_KEY_Llama, dangerouslyAllowBrowser: true });
      const chatCompletion = await groq.chat.completions.create({
        "messages": [
          {
            "role": "system",
            "content": model.prompt_parts.join(' ')
          },
          {
            "role": "user",
            "content": "What is it today (Date/Month/Year - Day)"
          },
          {
            "role": "assistant",
            "content": currentDate
          },
          ...conversationHistory,
        ],
        "model": model.model_name,
        "temperature": model.generation_config.temperature,
        "max_tokens": model.generation_config.max_tokens,
        "top_p": model.generation_config.top_p,
        "stream": model.generation_config.stream,
        "stop": model.generation_config.stop
      });

      let aiMessage = '';
      for await (const chunk of chatCompletion) {
        const content = chunk.choices[0]?.delta?.content || '';
        aiMessage += content;
      }
      q = userMessage;
      a = aiMessage;
      conversationHistory.push({ role: "assistant", content: a });
      appendMessage(model.label, a, true);
    }
  } catch (error) {
    console.error(error);
    appendMessage(model.label, "An error occurred while generating the response. Please try again.", true);
  } finally {
    hideLoadingDots(sendMessageButton, originalText);
    sendMessageButton.disabled = false;
  }
}


// Button Animation
function showLoadingDots(button) {
  let dots = 0;
  button.dataset.intervalId = setInterval(() => {
    dots = (dots % 3) + 1;
    button.textContent = '.'.repeat(dots);
  }, 500);
}

function hideLoadingDots(button, originalText) {
  clearInterval(button.dataset.intervalId);
  button.textContent = originalText;
}
