window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.localIntent = function(message){

const text=message.toLowerCase().trim();

if(

text.includes("hour")||

text.includes("time")||

text.includes("open")||

text.includes("close")

){

return{

type:"FAQ",

answer:window.KohaChatPlugin.KNOWLEDGE.library.hours

};

}

if (text.includes("membership") || text.includes("member")) {
  return { type: "FAQ", answer: window.KohaChatPlugin.KNOWLEDGE.library.membership };
}
if (text.includes("rule") || text.includes("allowed") || text.includes("dress")) {
  return { type: "FAQ", answer: window.KohaChatPlugin.KNOWLEDGE.library.rules };
}
if (text.includes("borrow") || text.includes("how many books") || text.includes("limit")) {
  return { type: "FAQ", answer: window.KohaChatPlugin.KNOWLEDGE.library.borrowLimit };
}

for(const item of window.KohaChatPlugin.FAQ){

if(text.includes(item.question)){

return{

type:"FAQ",

answer:item.answer

};

}

}

return{

type:"SERVER"

};

}
