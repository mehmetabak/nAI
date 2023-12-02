const API_KEY = import.meta.env.VITE_API_KEY;

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
    sendMessage();
};

function scrollToBottom() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function toggleMenuWindow() {
    const menuWindow = document.getElementById("menu-window");
    menuWindow.classList.toggle("opened");
}

function sendMessage() {
    const inputText = document.getElementById("input-text");
    const userMessage = inputText.value.trim();
    if (userMessage !== "") {
        appendMessage("User", userMessage);
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
                appendMessage("ALPGTR", data.candidates[0].output);
                scrollToBottom();
            });
        inputText.value = "";
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