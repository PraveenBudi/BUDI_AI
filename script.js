// Paste your API key securely here
const GROQ_API_KEY = "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"; 

let chats = JSON.parse(localStorage.getItem('premium_bot_chats')) || [];
let activeChatId = null;
let isSoundEnabled = false;

let isDarkMode = localStorage.getItem('theme') === 'dark';
if (isDarkMode) document.documentElement.setAttribute('data-theme', 'dark');

let attachedImage = null;
let attachedText = null;
let attachedFileName = null;

// DOM Elements
const chatListEl = document.getElementById('chatList');
const chatHistoryEl = document.getElementById('chatHistory');
const userInput = document.getElementById('userInput');
const attachBtn = document.getElementById('attachBtn');
const fileUpload = document.getElementById('fileUpload');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const micBtn = document.getElementById('micBtn');

// Sidebar Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const mobileOverlay = document.getElementById('mobileOverlay');

// --- Initialization ---
function init() {
    updateThemeIcon();
    if (chats.length === 0) createNewChat();
    else { activeChatId = chats[0].id; updateUI(); }
}

// --- Sidebar Logic ---
function toggleSidebar() {
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
        mobileOverlay.classList.toggle('active');
    } else {
        sidebar.classList.toggle('closed');
        const icon = sidebarToggleBtn.querySelector('span');
        icon.textContent = sidebar.classList.contains('closed') ? 'menu' : 'menu_open';
    }
}
sidebarToggleBtn.addEventListener('click', toggleSidebar);
mobileOverlay.addEventListener('click', toggleSidebar);

// --- Theme Logic ---
themeToggleBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
    updateThemeIcon();
});

function updateThemeIcon() {
    const icon = themeToggleBtn.querySelector('span');
    icon.textContent = isDarkMode ? 'dark_mode' : 'light_mode';
}

// --- Chat Management ---
function createNewChat() {
    const newChat = { id: Date.now(), title: `New Chat`, messages: [] };
    chats.unshift(newChat);
    activeChatId = newChat.id;
    saveData(); 
    updateUI();
    if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) toggleSidebar();
}

function switchChat(id) { 
    activeChatId = id; 
    updateUI(); 
    if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) toggleSidebar();
}

function deleteChat(id) {
    chats = chats.filter(chat => chat.id !== id);
    saveData();
    if (chats.length === 0) createNewChat();
    else if (id === activeChatId) { activeChatId = chats[0].id; updateUI(); }
    else updateUI();
}

function saveData() { localStorage.setItem('premium_bot_chats', JSON.stringify(chats)); }

// --- UI & Recommendation Engine ---
function updateUI() {
    chatListEl.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = chat.title;
        titleSpan.style.whiteSpace = 'nowrap';
        titleSpan.style.overflow = 'hidden';
        titleSpan.style.textOverflow = 'ellipsis';
        titleSpan.style.flexGrow = '1';

        const deleteBtn = document.createElement('span');
        deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">delete</span>'; 
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteChat(chat.id); };

        div.appendChild(titleSpan);
        div.appendChild(deleteBtn);
        div.onclick = () => switchChat(chat.id);
        chatListEl.appendChild(div);
    });

    chatHistoryEl.innerHTML = '';
    const activeChat = chats.find(c => c.id === activeChatId);
    
    if (activeChat && activeChat.messages.length === 0) {
        renderSmartSuggestions();
        return;
    }
    
    if (activeChat) {
        activeChat.messages.forEach((msg, index) => {
            const isLastBotMsg = (index === activeChat.messages.length - 1) && (msg.sender === 'bot');
            appendMessageToDOM(msg.sender, msg.text, isLastBotMsg);
        });
    }
}

function renderSmartSuggestions() {
    const smartDefaults = [
        "How do I prepare for product-based MNC interviews?",
        "Help me debug my Java object-oriented code",
        "What's a good AI/ML mini-project for my second semester?",
        "Explain how churn prediction models work",
        "How can I improve a Python chatbot's architecture?"
    ];

    const shuffled = smartDefaults.sort(() => 0.5 - Math.random());
    const selectedSuggestions = shuffled.slice(0, 3);

    const container = document.createElement('div');
    container.className = 'suggestions-container';
    
    const title = document.createElement('div');
    title.className = 'suggestions-title';
    title.textContent = 'How can I help you today?';
    
    const grid = document.createElement('div');
    grid.className = 'suggestions-grid';

    selectedSuggestions.forEach(suggestionText => {
        const pill = document.createElement('button');
        pill.className = 'suggestion-pill';
        pill.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">lightbulb</span> ${suggestionText}`;
        pill.onclick = () => {
            userInput.value = suggestionText;
            sendMessage();
        };
        grid.appendChild(pill);
    });

    container.appendChild(title);
    container.appendChild(grid);
    chatHistoryEl.appendChild(container);
}

// --- NEW: Refactored Message Injection ---
function appendMessageToDOM(sender, text, isLastBotMsg = false) {
    const msgContainer = document.createElement('div');
    msgContainer.className = `message ${sender === 'user' ? 'user-message' : 'bot-message'}`;

    // 1. Overlay Copy Button (Top Right of Bot Message)
    if (sender === 'bot') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-overlay-btn';
        copyBtn.title = 'Copy';
        copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text);
            copyBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
            setTimeout(() => { 
                copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>'; 
            }, 2000);
        };
        msgContainer.appendChild(copyBtn);
    }

    // 2. Main Message Content
    const textDiv = document.createElement('div');
    if (sender === 'bot') {
        textDiv.innerHTML = marked.parse(text);
    } else {
        textDiv.textContent = text;
    }
    msgContainer.appendChild(textDiv);

    // 3. Bottom Action Bar (Only for Regenerate on the latest Bot message)
    if (sender === 'bot' && isLastBotMsg) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';

        const regenBtn = document.createElement('button');
        regenBtn.className = 'action-link';
        regenBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">refresh</span> Regenerate';
        regenBtn.onclick = () => regenerateResponse();
        
        actionsDiv.appendChild(regenBtn);
        msgContainer.appendChild(actionsDiv);
    }

    chatHistoryEl.appendChild(msgContainer);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

// --- Dynamic Features ---
async function regenerateResponse() {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat || activeChat.messages.length < 2) return;

    activeChat.messages.pop(); // Remove bot's last answer
    const lastUserMsg = activeChat.messages[activeChat.messages.length - 1].text;
    
    updateUI();
    await fetchAPI(lastUserMsg, null, null, activeChat);
}

soundToggleBtn.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    const icon = soundToggleBtn.querySelector('span');
    if (isSoundEnabled) {
        icon.textContent = 'volume_up';
        soundToggleBtn.classList.add('sound-on');
    } else {
        icon.textContent = 'volume_off';
        soundToggleBtn.classList.remove('sound-on');
        window.speechSynthesis.cancel();
    }
});

function playAudioResponse(text) {
    const cleanText = text.replace(/[*#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0; 
    window.speechSynthesis.speak(utterance);
}

// --- Voice and Attachments ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    
    recognition.onstart = function() {
        micBtn.classList.add('mic-active');
        userInput.placeholder = "Listening...";
    };
    
    recognition.onresult = function(event) {
        userInput.value = event.results[0][0].transcript;
        sendMessage();
    };
    
    recognition.onend = function() {
        micBtn.classList.remove('mic-active');
        userInput.placeholder = "Ask AI Assistant...";
    };
} else {
    micBtn.style.display = 'none';
}

micBtn.addEventListener('click', () => {
    if (recognition) recognition.start();
});

attachBtn.addEventListener('click', () => fileUpload.click());

fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    attachedFileName = file.name;
    attachBtn.classList.add('attachment-active');
    userInput.placeholder = `Attached: ${file.name} - Type a prompt...`;

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => { attachedImage = e.target.result; attachedText = null; };
        reader.readAsDataURL(file);
    } else {
        const reader = new FileReader();
        reader.onload = (e) => { attachedText = e.target.result; attachedImage = null; };
        reader.readAsText(file);
    }
});

// --- Message Sending ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text && !attachedImage && !attachedText) return;

    const activeChat = chats.find(c => c.id === activeChatId);

    let userDisplayMessage = text;
    if (attachedFileName) {
        userDisplayMessage = `[Attached: ${attachedFileName}]\n${text}`;
    }

    if (activeChat.messages.length === 0) {
        activeChat.title = text.substring(0, 20) || attachedFileName.substring(0, 20) + '...';
    }

    activeChat.messages.push({ sender: 'user', text: userDisplayMessage });
    
    const payloadImage = attachedImage;
    const payloadText = attachedText;
    
    userInput.value = '';
    userInput.placeholder = "Ask AI Assistant...";
    attachBtn.classList.remove('attachment-active');
    attachedImage = null; attachedText = null; attachedFileName = null; fileUpload.value = '';
    
    updateUI();
    await fetchAPI(text, payloadImage, payloadText, activeChat);
}

// --- Direct Client-Side API Call ---
async function fetchAPI(text, imgData, fileData, activeChat) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message';
    loadingDiv.innerHTML = '<span class="material-symbols-outlined" style="animation: pulse 1.5s infinite;">model_training</span> Analyzing...';
    chatHistoryEl.appendChild(loadingDiv);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    const messages = [];
    activeChat.messages.forEach(msg => {
        if (msg.sender !== 'error' && msg.text !== text) { 
            messages.push({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            });
        }
    });

    let currentContent = [];
    if (fileData) currentContent.push({ type: "text", text: `Attached Document Content:\n${fileData}` });
    if (text) currentContent.push({ type: "text", text: text });
    if (imgData) currentContent.push({ type: "image_url", image_url: { url: imgData } });

    messages.push({ role: "user", content: currentContent });

    const modelName = imgData ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                model: modelName,
                messages: messages,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);

        const reply = data.choices[0].message.content;
        
        chatHistoryEl.removeChild(loadingDiv);
        activeChat.messages.push({ sender: 'bot', text: reply });
        saveData();
        updateUI(); 

        if (isSoundEnabled) playAudioResponse(reply);

    } catch (error) {
        chatHistoryEl.removeChild(loadingDiv);
        activeChat.messages.push({ sender: 'bot', text: `API Error: ${error.message}` });
        saveData();
        updateUI();
    }
}

// --- OS Native Sharing ---
document.getElementById('shareBtn').addEventListener('click', async () => {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat || activeChat.messages.length === 0) return alert("This chat is empty!");

    let chatTranscript = "Check out my AI Conversation:\n\n";
    activeChat.messages.forEach(msg => { chatTranscript += `${msg.sender.toUpperCase()}:\n${msg.text}\n\n`; });

    if (navigator.share) {
        try { await navigator.share({ title: activeChat.title, text: chatTranscript }); } 
        catch (err) { console.log("Share menu closed."); }
    } else {
        navigator.clipboard.writeText(chatTranscript);
        alert("Chat copied to your clipboard!");
    }
});

document.getElementById('sendBtn').addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

init();