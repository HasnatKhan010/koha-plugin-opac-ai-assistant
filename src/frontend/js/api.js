window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.API = {

async chat(message, history = []){
const response=await fetch(
window.KohaChatPlugin.CONFIG.API_URL,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
message:message,
history:history
})
}
);
if(!response.ok){
throw new Error("Server Error");
}
return await response.json();
},

async suggest(query){
const response=await fetch(
`${window.KohaChatPlugin.CONFIG.API_URL.replace("/chat", "")}/suggestions?q=${encodeURIComponent(query)}`
);
if(!response.ok){
return {suggestions:[]};
}
return await response.json();
}
};
