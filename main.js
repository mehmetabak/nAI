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

var AIPP = "https://static-00.iconduck.com/assets.00/ai-human-icon-256x256-j1bia0vl.png";  //Default AI Profile Picture

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

  /*
  if (hasSeenNotificationBefore == null) {
    showNotification('Welcome to the nAI!', selectedImage);
    localStorage.setItem('hasSeenNotificationBefore', 'true');
  }
  */
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
  window.location.reload();
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
    
    appendMessage("User", userMessage, false, AIPP);
    inputText.value = "";

    var selectedModel = models.find(m => m.name === localStorage.getItem('model'));
    if (selectedModel) {
      generateResponse(selectedModel, originalText);
    } else {
      generateResponse(models[0], originalText);
    }
  }
};

document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    sendMessageButton.click();
  }
});

function appendMessage(sender, message, isAI, AIPP, imageBase64 = null) {
  const messageElement = createMessageElement(sender, message, isAI, AIPP, imageBase64);

  if (!isEmptySpaceAdded) {
    chatMessages.appendChild(messageElement);
    isEmptySpaceAdded = true;
  } else {
     if (chatMessages.contains(emptySpace)) {
       chatMessages.removeChild(emptySpace);
    }
    chatMessages.appendChild(messageElement);
  }
  chatMessages.appendChild(emptySpace);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Add text content to history (or placeholder for image)
   if (message && message.trim() !== "") {
       conversationHistory.push({ role: isAI ? "assistant" : "user", content: message });
   } else if (isAI && imageBase64) {
       conversationHistory.push({ role: "assistant", content: "[Image Generated by Imagen]" }); // Indicate source
   } else if (!isAI) {
        if (message) {
            conversationHistory.push({ role: "user", content: message });
        }
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
      appendMessage(model.label, a, true, model.AIPP);
    } else if (model.api_key === "API_KEY_Gemini_GenContent_Image") {
      console.log("Attempting TEXT generation via generateContent with", model.model_name, "(removed image params)");
      const genAI = new GoogleGenerativeAI(API_KEY_Gemini);

      try {
        // 1. Get model instance
        const modelInstance = genAI.getGenerativeModel({
             model: model.model_name,
             safetySettings: model.safety_settings.map(setting => ({
                category: HarmCategory[setting.category],
                threshold: HarmBlockThreshold[setting.threshold]
             }))
          });
        console.log("Model instance obtained:", modelInstance);

        console.log(modelInstance.ListModels());
        // 2. Prepare parts
        const parts = model.prompt_parts.map(part => ({
            text: part.replace('${userMessage}', userMessage)
                       .replace('${q}', q)
                       .replace('${a}', a)
                       .replace('${date}', currentDate)
        }));
        console.log("Sending parts:", parts);

        // 3. Prepare generationConfig *WITHOUT* responseMimeType & responseModalities
        const generationConfig = {
          // Spread basic configs from models.json
          ...(model.generation_config.temperature && { temperature: model.generation_config.temperature }),
          ...(model.generation_config.topK && { topK: model.generation_config.topK }),
          ...(model.generation_config.topP && { topP: model.generation_config.topP }),
          ...(model.generation_config.maxOutputTokens && { maxOutputTokens: model.generation_config.maxOutputTokens }),
          ...(model.generation_config.candidateCount && { candidateCount: model.generation_config.candidateCount }),
          // Removed: responseMimeType: model.generation_config.responseMimeType,
          // Removed: responseModalities: model.generation_config.responseModalities
        };
        console.log("Generation Config (Text Only):", generationConfig);

        // 4. Call generateContent
        const result = await modelInstance.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig: generationConfig,
        });

        // 5. Process response (Expecting only text now)
        const response = result.response;
        let textResponse = response.text(); // Directly get text
        console.log("Text response received:", textResponse);

        // ImageBase64 will be null
        let imageBase64 = null;

        q = userMessage;
        a = textResponse || "[No Text Response]";

        // Append only the text message
        appendMessage(model.label, textResponse, true, model.AIPP, null); // Pass null for image

      } catch (error) {
        console.error("Error during text generation via generateContent:", error);
        let errorMessage = "An error occurred during generateContent call.";
         if (error instanceof Error) {
             errorMessage += ` Details: ${error.message}`;
         } else if (error.status) {
             errorMessage += ` Status: ${error.status}, Message: ${error.statusText}`;
         } else {
             errorMessage += ` Unexpected error structure: ${JSON.stringify(error)}`;
         }
        appendMessage(model.label, errorMessage, true, "https://i.imgur.com/2Rs5ya9.png");
      }
    } else if(model.api_key === "API_KEY_G/C"){
      // Gemini Chat API call for Experimental Models
      
      const genAI = new GoogleGenerativeAI(API_KEY_Gemini);
      const modelZ = genAI.getGenerativeModel({
          model: model.model_name,
          systemInstruction: model.prompt_parts.join(' '),
      });

      const generationConfig = {
          temperature: model.generation_config.temperature,
          topK: model.generation_config.topK,
          topP: model.generation_config.topP,
          maxOutputTokens: model.generation_config.maxOutputTokens,
      };

      const formattedHistory = [
          {
              role: "user",
              parts: [
                { text: "What is it today (Date/Month/Year - Day)" }
              ],
          },
          {
              role: "model",
              parts: [
                  { text: currentDate }
              ],
          },
          ...conversationHistory.map(message => ({
              role: message.role,
              parts: [{ text: message.content }], 
          })),
      ];

      const chatSession = modelZ.startChat({
          generationConfig,
          history: formattedHistory,
      });

      let aiMessage = '';
      try {
          const result = await chatSession.sendMessageStream(userMessage);
          for await (const chunk of result.stream) {
              const content = chunk.text();
              aiMessage += content;
          }
          q = userMessage;
          a = aiMessage;

          appendMessage(model.label, a, true, model.AIPP);

      } catch (error) {
          console.error("Error during Gemini API call:", error);
          appendMessage(model.label, "Error getting response from the model", true, "https://i.imgur.com/2Rs5ya9.png");
      }
    }
    else if(model.api_key === "API_KEY_Llama"){
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

      appendMessage(model.label, a, true, model.AIPP);
    }
  } catch (error) {
    console.error(error);
    appendMessage(model.label, "An error occurred while generating the response. Please try again.", true, "https://i.imgur.com/2Rs5ya9.png");
  } finally {
    hideLoadingDots(sendMessageButton, originalText);
    sendMessageButton.disabled = false;
  }
}


// Button Animation
function showLoadingDots(button) {
  button.classList.add('loading');
}

function hideLoadingDots(button, originalText) {
  button.classList.remove('loading');
}
