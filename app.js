const $ = (id) => document.getElementById(id);
const input = $("messageInput");
const sendButton = $("sendButton");
const messages = $("messages");
const welcome = $("welcome");
const historyList = $("historyList");
const STORAGE_KEY = "retzef-ai-chats-v1";
let chats = loadChats();
let activeChatId = null;

function loadChats(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return []}}
function saveChats(){localStorage.setItem(STORAGE_KEY,JSON.stringify(chats))}
function currentChat(){return chats.find(c=>c.id===activeChatId)}
function newChat(){
  activeChatId = null;
  messages.innerHTML = "";
  welcome.hidden = false;
  renderHistory();
  input.focus();
}
function renderHistory(){
  historyList.innerHTML = "";
  if(!chats.length){const empty=document.createElement("div");empty.className="history-empty";empty.textContent="השיחות החדשות יופיעו כאן";historyList.append(empty);return}
  chats.slice().reverse().forEach(chat=>{
    const b=document.createElement("button");b.className="history-item"+(chat.id===activeChatId?" active":"");b.textContent=chat.title;b.title=chat.title;
    b.addEventListener("click",()=>openChat(chat.id));historyList.append(b);
  });
}
function openChat(id){
  activeChatId=id;const chat=currentChat();if(!chat)return;
  messages.innerHTML="";welcome.hidden=true;
  chat.messages.forEach(m=>appendMessage(m.role,m.text,false));
  renderHistory();closeSidebar();
}
function appendMessage(role,text,notice=false){
  const row=document.createElement("div");row.className="message "+(role==="user"?"user":"assistant");
  const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=role==="user"?"אתם":"R";
  const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=text;
  row.append(avatar,bubble);messages.append(row);
  if(notice){const n=document.createElement("div");n.className="notice";n.textContent="ההודעה נשמרה בשיחה, אבל Retzef test 1.0 עדיין לא מחובר לממשק. לא נוצרה תשובת AI. השלב הבא הוא לחבר את מנוע המודל העצמאי.";messages.append(n)}
  messages.scrollTop=messages.scrollHeight;
}
function saveMessage(role,text){
  if(!activeChatId){activeChatId=String(Date.now());chats.push({id:activeChatId,title:text.slice(0,34)||"שיחה חדשה",messages:[]})}
  const chat=currentChat();chat.messages.push({role,text});saveChats();renderHistory();
}
async function sendMessage(){
  const text=input.value.trim();if(!text)return;
  input.value="";resizeInput();sendButton.disabled=true;welcome.hidden=true;
  saveMessage("user",text);appendMessage("user",text);
  try{
    const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,conversation_id:activeChatId})});
    const data=await response.json();
    if(data.reply){saveMessage("assistant",data.reply);appendMessage("assistant",data.reply)}
    else appendMessage("assistant",data.message||"המודל עדיין לא מחובר.",true);
  }catch{
    appendMessage("assistant","לא ניתן להתחבר כרגע לשרת של Retzef AI.",true);
  }finally{sendButton.disabled=!input.value.trim();input.focus()}
}
function resizeInput(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,150)+"px";sendButton.disabled=!input.value.trim()}
function openSidebar(){$("sidebar").classList.add("open");$("backdrop").classList.add("show")}
function closeSidebar(){$("sidebar").classList.remove("open");$("backdrop").classList.remove("show")}
$("newChat").addEventListener("click",()=>{newChat();closeSidebar()});
$("sendButton").addEventListener("click",sendMessage);
input.addEventListener("input",resizeInput);
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}});
$("openSidebar").addEventListener("click",openSidebar);
$("closeSidebar").addEventListener("click",closeSidebar);
$("backdrop").addEventListener("click",closeSidebar);
document.querySelectorAll(".suggestion").forEach(b=>b.addEventListener("click",()=>{input.value=b.dataset.prompt;resizeInput();sendMessage()}));
renderHistory();
