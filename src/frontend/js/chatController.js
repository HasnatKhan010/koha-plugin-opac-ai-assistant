window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.addMessage = function(type,message){

const messages=document.getElementById("koha-chat-messages");

const row=document.createElement("div");

row.className="message "+type;

const bubble=document.createElement("div");

bubble.className="bubble";

if (typeof message === 'string') {
    // Strip onerror completely so it doesn't try to load external fallbacks
    message = message.replace(/onerror\s*=\s*["'][^"']*["']/gi, "");
    // Strip placehold.co just in case
    message = message.replace(/src\s*=\s*["']https:\/\/placehold\.co[^"']*["']/gi, "src=\"\"");
}

bubble.innerHTML=message;

const time=document.createElement("div");

time.className="message-time";

time.innerText=window.KohaChatPlugin.currentTime();

if (type === "bot") {
    const speaker = document.createElement("button");
    speaker.className = "speaker-btn";
    speaker.innerHTML = window.KohaChatPlugin.ICONS.speaker;
    speaker.setAttribute("aria-label", "Read aloud");
    speaker.onclick = function() {
        if(window.KohaChatPlugin.speak) {
            // Find the plain text message to read (strip HTML)
            const textDiv = bubble.querySelector('.chat-message-text');
            const textToSpeak = textDiv ? textDiv.innerText : bubble.innerText;
            window.KohaChatPlugin.speak(textToSpeak);
        }
    };
    time.appendChild(speaker);
}

bubble.appendChild(time);

row.appendChild(bubble);

messages.appendChild(row);

window.KohaChatPlugin.scrollToBottom();

}
