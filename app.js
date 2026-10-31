const input=document.getElementById("messageInput");
const sendButton=document.createElement("button");
sendButton.type="button";
sendButton.className="send-inline";
sendButton.textContent="↑";
sendButton.setAttribute("aria-label","שלח הודעה");
sendButton.hidden=true;
document.querySelector(".composer").insertBefore(sendButton,document.getElementById("plusButton"));
const messages=document.getElementById("messages");
const quickActions=document.getElementById("quickActions");
const plusButton=document.getElementById("plusButton");
const toolPopover=document.getElementById("toolPopover");
const STORAGE_KEY="retzef-ai-mobile-chat-v2";
let history=[];
try{history=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{}
function resize(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,140)+"px";sendButton.hidden=!input.value.trim();plusButton.hidden=!!input.value.trim()}
function append(role,text){const row=document.createElement("div");row.className="message "+role;const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=role==="user"?"U":"R";const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=text;row.append(avatar,bubble);messages.append(row)}
async function send(){const text=input.value.trim();if(!text)return;input.value="";resize();quickActions.hidden=true;append("user",text);history.push({role:"user",text});try{const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text})});const data=await response.json();append("assistant",data.message||"Retzef test 1.0 עדיין לא מחובר. ההודעה התקבלה, אבל עדיין אין תשובת מודל אמיתית.");}catch{append("assistant","לא ניתן להתחבר כרגע לשרת של Retzef AI.");}messages.scrollTop=messages.scrollHeight;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(history))}catch{}}
input.addEventListener("input",resize);
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
sendButton.addEventListener("click",send);
document.querySelectorAll(".quick-action").forEach(button=>button.addEventListener("click",()=>{input.value=button.dataset.prompt;input.focus();resize();}));
plusButton.addEventListener("click",()=>{toolPopover.hidden=!toolPopover.hidden});
document.getElementById("voiceButton").addEventListener("click",()=>{toolPopover.textContent="מצב קול יתווסף בהמשך";toolPopover.hidden=false});
document.getElementById("micButton").addEventListener("click",()=>{toolPopover.textContent="הקלטת קול תתווסף בהמשך";toolPopover.hidden=false});
document.addEventListener("click",e=>{if(!e.target.closest("#plusButton")&&!e.target.closest("#voiceButton")&&!e.target.closest("#micButton")&&!e.target.closest("#toolPopover"))toolPopover.hidden=true});
resize();
