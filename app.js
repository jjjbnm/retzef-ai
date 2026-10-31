const $=id=>document.getElementById(id),input=$("messageInput"),send=$("sendBtn"),messages=$("messages"),welcome=$("welcome"),history=$("historyList");
const KEY="retzef-ai-chats-v1";let chats=[];let active=null;
try{chats=JSON.parse(localStorage.getItem(KEY)||"[]")}catch{chats=[]}
const save=()=>localStorage.setItem(KEY,JSON.stringify(chats));
const current=()=>chats.find(c=>c.id===active);
function renderHistory(){history.innerHTML="";if(!chats.length){const e=document.createElement("div");e.className="empty-history";e.textContent="השיחות שלך יופיעו כאן";history.append(e);return}chats.slice().reverse().forEach(c=>{const b=document.createElement("button");b.className="history-item"+(c.id===active?" active":"");b.textContent=c.title; b.onclick=()=>openChat(c.id);history.append(b)})}
function newChat(){active=null;messages.innerHTML="";welcome.hidden=false;renderHistory();closeSide();input.focus()}
function openChat(id){active=id;const c=current();if(!c)return;messages.innerHTML="";welcome.hidden=true;c.messages.forEach(m=>append(m.role,m.text));renderHistory();closeSide()}
function append(role,text,notice=false){const row=document.createElement("div");row.className="message "+role;const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=role==="user"?"א":"R";const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=text;row.append(avatar,bubble);messages.append(row);if(notice){const n=document.createElement("div");n.className="notice";n.textContent="Retzef test 1.0 עדיין לא מחובר. ההודעה נשמרה, אך לא נוצרה תשובת AI.";messages.append(n)}$("chatArea").scrollTop=$("chatArea").scrollHeight}
function store(role,text){if(!active){active=String(Date.now());chats.push({id:active,title:text.slice(0,32)||"שיחה חדשה",messages:[]})}current().messages.push({role,text});save();renderHistory()}
async function sendMessage(){const text=input.value.trim();if(!text)return;input.value="";resize();welcome.hidden=true;store("user",text);append("user",text);send.disabled=true;try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,conversation_id:active})});const d=await r.json();if(d.reply){store("assistant",d.reply);append("assistant",d.reply)}else append("assistant",d.message||"המודל עדיין לא מחובר.",true)}catch{append("assistant","לא ניתן להתחבר לשרת כרגע.",true)}finally{send.disabled=!input.value.trim();input.focus()}}
function resize(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,150)+"px";send.disabled=!input.value.trim()}
function openSide(){$("sidebar").classList.add("open");$("shade").classList.add("show")}
function closeSide(){$("sidebar").classList.remove("open");$("shade").classList.remove("show")}
function toast(t){const el=$("toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
$("newChat").onclick=newChat;$("sendBtn").onclick=sendMessage;input.addEventListener("input",resize);input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}});
$("openSide").onclick=openSide;$("closeSide").onclick=closeSide;$("shade").onclick=closeSide;
$("attachBtn").onclick=()=>toast("אפשרות צירוף קבצים תתווסף בהמשך");$("micBtn").onclick=()=>toast("הקלטה קולית תתווסף בהמשך");$("shareBtn").onclick=()=>{if(navigator.share)navigator.share({title:"Retzef AI",url:location.href}).catch(()=>{});else toast("אפשר להעתיק את כתובת האתר לשיתוף")};
$("searchChats").onclick=()=>{const q=prompt("חיפוש בשיחות");if(!q)return;const c=chats.find(x=>x.title.toLowerCase().includes(q.toLowerCase()));if(c)openChat(c.id);else toast("לא נמצאו שיחות מתאימות")};
renderHistory();