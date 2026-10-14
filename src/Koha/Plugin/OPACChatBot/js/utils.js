window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.escapeHTML = function(text){

const div=document.createElement("div");

div.textContent=text;

return div.innerHTML;

}

window.KohaChatPlugin.scrollToBottom = function(){

const box=document.getElementById("koha-chat-messages");

if(!box) return;

box.scrollTop=box.scrollHeight;

}

window.KohaChatPlugin.currentTime = function(){

return new Date().toLocaleTimeString([],{

hour:"2-digit",

minute:"2-digit"

});

}

window.KohaChatPlugin.createSkeleton = function() {

  return `
    <div class="message bot skeleton-message">
      <div class="loading-card" style="width: 260px;">
        <div class="loading-line"></div>
        <div class="loading-line"></div>
        <div class="loading-line"></div>
        <div style="font-size: 11px; color: var(--koha-chat-primary); margin-top: 12px; font-weight: 500; font-style: italic; text-align: center; animation: pulse 1.5s infinite;" id="koha-chat-status-text">Processing...</div>
      </div>
    </div>
  `;
}

window.KohaChatPlugin.removeSkeleton = function() {

  const skeleton = document.querySelector(".skeleton-message");
  if (skeleton) {
    skeleton.remove();
  }
}

window.KohaChatPlugin.sleep = function(ms){

return new Promise(resolve=>setTimeout(resolve,ms));
}

window.KohaChatPlugin.debounce = function(func, wait) {

    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
