/* =========================================================
   JARVIS AI
   ========================================================= */

const API_KEY = "";
const MODEL = "gemini-3.6-flash";

let conversation = [];
let voiceEnabled = true;
let voiceSpeed = 0.95;
let voiceLanguage = "en-IN";
let memoryEnabled = true;
const MEMORY_KEY = "jarvisConversation";
let typingElement = null;

document.addEventListener("DOMContentLoaded", function () {
    console.log("JARVIS JavaScript started");
    setupButtons();
    loadSettings();
    loadMemory();
    showWelcomeMessage();
});

function setupButtons() {
    const settingsBtn = document.getElementById("settingsBtn");
    const closeSettingsBtn = document.getElementById("closeSettingsBtn");
    const voiceButton = document.getElementById("voiceButton");
    const stopButton = document.getElementById("stopButton");
    const clearButton = document.getElementById("clearButton");
    const sendButton = document.getElementById("sendButton");
    const userInput = document.getElementById("userInput");
    const voiceToggle = document.getElementById("voiceToggle");
    const voiceSpeedInput = document.getElementById("voiceSpeed");
    const voiceLanguageInput = document.getElementById("voiceLanguage");
    const memoryToggle = document.getElementById("memoryToggle");
    const testVoiceButton = document.getElementById("testVoiceButton");
    const clearMemoryButton = document.getElementById("clearMemoryButton");

    settingsBtn.addEventListener("click", openSettings);
    closeSettingsBtn.addEventListener("click", closeSettings);
    voiceButton.addEventListener("click", toggleVoice);
    stopButton.addEventListener("click", stopSpeaking);
    clearButton.addEventListener("click", clearChatOnly);
    sendButton.addEventListener("click", sendMessage);

    userInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    voiceToggle.addEventListener("change", function () {
        voiceEnabled = voiceToggle.checked;
        saveSettings();
        updateVoiceButton();
    });

    voiceSpeedInput.addEventListener("input", function () {
        voiceSpeed = parseFloat(voiceSpeedInput.value);
        document.getElementById("voiceSpeedValue").textContent = voiceSpeed.toFixed(2) + "x";
        saveSettings();
    });

    voiceLanguageInput.addEventListener("change", function () {
        voiceLanguage = voiceLanguageInput.value;
        saveSettings();
    });

    memoryToggle.addEventListener("change", function () {
        memoryEnabled = memoryToggle.checked;
        saveSettings();
    });

    testVoiceButton.addEventListener("click", function () {
        speakText("Hello! I am JARVIS. Your voice system is working.");
    });

    clearMemoryButton.addEventListener("click", function () {
        clearMemory();
    });

    document.getElementById("settingsOverlay").addEventListener("click", function (event) {
        if (event.target === this) {
            closeSettings();
        }
    });
}

function showWelcomeMessage() {
    const chatBox = document.getElementById("chatBox");
    if (chatBox.children.length > 0) {
        return;
    }

    addMessage(
        "jarvis",
        "Hello! I am JARVIS. 🤖\n\n" +
        "I am ready to help you.\n\n" +
        "Try:\n" +
        "• hello\n" +
        "• time\n" +
        "• date\n" +
        "• calculate 25*4\n" +
        "• google cats\n" +
        "• youtube music\n" +
        "• open google"
    );
}

function addMessage(sender, text) {
    const chatBox = document.getElementById("chatBox");
    const message = document.createElement("div");
    message.className = "message " + sender;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    const time = document.createElement("div");
    time.className = "time";
    time.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    bubble.appendChild(time);
    message.appendChild(bubble);
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
    hideTyping();
    const chatBox = document.getElementById("chatBox");
    const message = document.createElement("div");
    message.className = "message jarvis";
    message.id = "typingMessage";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = "<span></span><span></span><span></span>";

    bubble.appendChild(typing);
    message.appendChild(bubble);
    chatBox.appendChild(message);
    typingElement = message;
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTyping() {
    const element = document.getElementById("typingMessage");
    if (element) {
        element.remove();
    }
    typingElement = null;
}

async function sendMessage() {
    const input = document.getElementById("userInput");
    const text = input.value.trim();

    if (!text) {
        return;
    }

    input.value = "";
    addMessage("user", text);
    conversation.push({ role: "user", text: text });
    saveConversation();

    const localReply = await handleLocalCommand(text);
    if (localReply !== null) {
        addMessage("jarvis", localReply);
        conversation.push({ role: "assistant", text: localReply });
        saveConversation();
        speakText(localReply);
        return;
    }

    showTyping();

    try {
        const reply = await askGemini(text);
        hideTyping();
        addMessage("jarvis", reply);
        conversation.push({ role: "assistant", text: reply });
        saveConversation();
        speakText(reply);
    } catch (error) {
        hideTyping();
        console.error(error);
        const message = "Gemini error:\n\n" + error.message;
        addMessage("jarvis", message);
    }
}

async function askGemini(text) {
    if (!API_KEY || API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        throw new Error("Gemini API key is missing. Add your API key near the top of script.js.");
    }

    const systemInstruction = "You are JARVIS, a friendly personal AI assistant. Give clear, useful and concise answers. The user is chatting from a mobile phone.";
    const recentConversation = conversation.slice(-10).map(function (item) {
        return item.role + ": " + item.text;
    }).join("\n");

    const prompt = systemInstruction + "\n\nConversation:\n" + recentConversation + "\n\nUser: " + text + "\n\nJARVIS:";
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": API_KEY
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Gemini API error " + response.status + ": " + errorText);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
        throw new Error("Gemini returned an empty response.");
    }

    return reply.trim();
}

async function handleLocalCommand(text) {
    const original = text.trim();
    const command = original.toLowerCase();

    if (command === "hello" || command === "hi" || command === "hey jarvis") {
        return "Hello! I'm JARVIS. How can I help you?";
    }

    if (command.includes("how are you") || command.includes("how r you")) {
        return "I'm doing great and ready to help you.";
    }

    if (command.includes("who are you") || command.includes("what are you")) {
        return "I'm JARVIS, your personal AI assistant.";
    }

    if (command === "time" || command.includes("what time is it") || command.includes("current time")) {
        return "The current time is " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    if (command === "date" || command.includes("today's date") || command.includes("what is today's date")) {
        return "Today's date is " + new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }

    if (command.startsWith("google ")) {
        const query = original.substring(7).trim();
        if (query) {
            window.open("https://www.google.com/search?q=" + encodeURIComponent(query), "_blank");
            return "Searching Google for " + query;
        }
    }

    if (command.startsWith("youtube ")) {
        const query = original.substring(8).trim();
        if (query) {
            window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(query), "_blank");
            return "Searching YouTube for " + query;
        }
    }

    if (command === "google" || command === "open google") {
        window.open("https://www.google.com", "_blank");
        return "Opening Google.";
    }

    if (command === "youtube" || command === "open youtube") {
        window.open("https://www.youtube.com", "_blank");
        return "Opening YouTube.";
    }

    if (command.startsWith("calculate ")) {
        const expression = original.substring(10).trim();
        if (expression) {
            return calculateExpression(expression);
        }
    }

    if (/^[0-9+\-*/().%\s]+$/.test(command)) {
        return calculateExpression(command);
    }

    if (command === "clear" || command === "clear chat") {
        clearChatOnly();
        return "Chat cleared.";
    }

    if (command === "stop" || command === "stop speaking" || command === "be quiet") {
        stopSpeaking();
        return "Voice stopped.";
    }

    return null;
}

function calculateExpression(expression) {
    try {
        if (!/^[0-9+\-*/().%\s]+$/.test(expression)) {
            return "I can only calculate basic mathematical expressions.";
        }

        const result = Function('"use strict"; return (' + expression + ')')();

        if (typeof result !== "number" || !Number.isFinite(result)) {
            return "I couldn't calculate that.";
        }

        return expression + " = " + result;
    } catch (error) {
        return "I couldn't calculate that expression.";
    }
}

function saveConversation() {
    if (!memoryEnabled) {
        return;
    }
    try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(conversation.slice(-50)));
    } catch (error) {
        console.error("Memory save failed:", error);
    }
}

function loadMemory() {
    try {
        const saved = localStorage.getItem(MEMORY_KEY);
        if (saved) {
            conversation = JSON.parse(saved);
        }
    } catch (error) {
        conversation = [];
        console.error("Memory load failed:", error);
    }
}

function clearMemory() {
    localStorage.removeItem(MEMORY_KEY);
    conversation = [];
    addMessage("jarvis", "JARVIS memory has been cleared.");
}

function clearChatOnly() {
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = "";
    showWelcomeMessage();
}

function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    saveSettings();
    updateVoiceButton();
    if (!voiceEnabled) {
        stopSpeaking();
    }
}

function updateVoiceButton() {
    const button = document.getElementById("voiceButton");
    if (voiceEnabled) {
        button.textContent = "🔊 Voice ON";
    } else {
        button.textContent = "🔇 Voice OFF";
    }
}

function speakText(text) {
    if (!voiceEnabled) {
        return;
    }
    if (!("speechSynthesis" in window)) {
        return;
    }
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLanguage;
    utterance.rate = voiceSpeed;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
}

function openSettings() {
    document.getElementById("settingsOverlay").classList.add("show");
}

function closeSettings() {
    document.getElementById("settingsOverlay").classList.remove("show");
}

function saveSettings() {
    const settings = {
        voiceEnabled: voiceEnabled,
        voiceSpeed: voiceSpeed,
        voiceLanguage: voiceLanguage,
        memoryEnabled: memoryEnabled
    };
    localStorage.setItem("jarvisSettings", JSON.stringify(settings));
}

function loadSettings() {
    try {
        const saved = localStorage.getItem("jarvisSettings");
        if (saved) {
            const settings = JSON.parse(saved);
            if (typeof settings.voiceEnabled === "boolean") voiceEnabled = settings.voiceEnabled;
            if (typeof settings.voiceSpeed === "number") voiceSpeed = settings.voiceSpeed;
            if (typeof settings.voiceLanguage === "string") voiceLanguage = settings.voiceLanguage;
            if (typeof settings.memoryEnabled === "boolean") memoryEnabled = settings.memoryEnabled;
        }
    } catch (error) {
        console.error("Settings load failed:", error);
    }

    document.getElementById("voiceToggle").checked = voiceEnabled;
    document.getElementById("voiceSpeed").value = voiceSpeed;
    document.getElementById("voiceSpeedValue").textContent = voiceSpeed.toFixed(2) + "x";
    document.getElementById("voiceLanguage").value = voiceLanguage;
    document.getElementById("memoryToggle").checked = memoryEnabled;
    updateVoiceButton();
}

window.addEventListener("error", function (event) {
    console.error("JARVIS ERROR:", event.error || event.message);
});

window.addEventListener("unhandledrejection", function (event) {
    console.error("JARVIS PROMISE ERROR:", event.reason);
});

console.log("JARVIS is running successfully.");
                                                       
