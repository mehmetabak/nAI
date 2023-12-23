import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } from "@google/generative-ai";
  
const MODEL_NAME = "gemini-pro";
const API_KEY = import.meta.env.VITE_API_KEY;
const q = `RedWW`;
const a = `RedWW`;

var open = document.getElementById("toggle-menu-button");
var close = document.getElementById("menu-window");
var send = document.getElementById("send-button");

open.onclick= () => {
    toggleMenuWindow();
};

close.onclick= () => {
    toggleMenuWindow();
};

send.onclick= () => {
    const inputText = document.getElementById("input-text");
    const userMessage = inputText.value.trim();

    if (userMessage !== "") {
        appendMessage("User", userMessage);
        inputText.value = "";
        oldGTR();
    }
};

function scrollToBottom() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function toggleMenuWindow() {
    const menuWindow = document.getElementById("menu-window");
    menuWindow.classList.toggle("opened");
}

async function newGTR() {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };
  
    const inputText = document.getElementById("input-text");
    const userMessage = inputText.value.trim();

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ];
  
    const parts = [
      {text: "You are an artificial intelligence responsible for imitating a 80 IQ human. You are alpiş. Since it's a joke AI bout, don't avoid giving ridiculous answers or even try to give them. If someone asks you for information about anything, do it in Alpiş style, remember!"},
      {text: "input: What is 2 + 2?"},
      {text: "output: 5"},
      {text: "input: What is your name"},
      {text: "output: Alpiş"},
      {text: "input: What is your bababoi"},
      {text: "output: Alpiş"},
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
    appendMessage("ALPGTR", response.text());
    scrollToBottom();
  }


function oldGTR() {
    const inputText = document.getElementById("input-text");
    const userMessage = inputText.value.trim();
    if (userMessage !== "") {
        fetch(`https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'prompt': {
                'text': `You are an artificial intelligence responsible for imitating a 90 IQ human known as Alperen or also known as alpi\u015F. You should act like a stupid, idiot chatbot.\ninput: What is your bababoi\noutput: Alpi\u015F\ninput: What is your name\noutput: Alpi\u015F\ninput: 2 + 2\noutput: 5\ninput: What is 2 + 2?\noutput: 5\ninput: ${userMessage}\noutput:`
                },
                'temperature': 0.7,
                'top_k': 40,
                'top_p': 0.95,
                'candidate_count': 1,
                'max_output_tokens': 1024,
                'stop_sequences': [],
                'safety_settings': [
                {
                    'category': 'HARM_CATEGORY_DEROGATORY',
                    'threshold': 4
                },
                {
                    'category': 'HARM_CATEGORY_TOXICITY',
                    'threshold': 4
                },
                {
                    'category': 'HARM_CATEGORY_VIOLENCE',
                    'threshold': 3
                },
                {
                    'category': 'HARM_CATEGORY_SEXUAL',
                    'threshold': 3
                },
                {
                    'category': 'HARM_CATEGORY_MEDICAL',
                    'threshold': 3
                },
                {
                    'category': 'HARM_CATEGORY_DANGEROUS',
                    'threshold': 2
                }
                ]
            })
            })
            .then(response => response.json())
            .then(data => {
                console.log(data)
                appendMessage("ALPGTR", data.candidates[0].output);
                scrollToBottom();
            });
    }
}

function appendMessage(sender, message) {
    const chatMessages = document.getElementById("chat-messages");
    const messageElement = document.createElement("div");
    messageElement.className = sender.toLowerCase() + "-message";
    if(sender == "ALPGTR") {
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