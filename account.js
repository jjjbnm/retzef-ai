(() => {
  let mode = "login";
  let ready = false;
  const $ = id => document.getElementById(id);
  const screen = () => $("authScreen");
  function setMode(next) {
    mode = next;
    $("loginTab").classList.toggle("active", mode === "login");
    $("registerTab").classList.toggle("active", mode === "register");
    $("confirmWrap").hidden = mode !== "register";
    $("authConfirm").required = mode === "register";
    $("authPassword").autocomplete = mode === "register" ? "new-password" : "current-password";
    $("authSubtitle").textContent = mode === "register" ? "צור חשבון כדי לשמור את השיחות שלך בענן" : "התחבר לחשבון שלך כדי לשמור שיחות בענן";
    $("authSubmit").textContent = mode === "register" ? "Create account" : "Login";
    $("authError").textContent = "";
  }
  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "הבקשה נכשלה.");
    return data;
  }
  function show(username) {
    screen().hidden = true;
    const name = document.querySelector(".profile-name b");
    const detail = document.querySelector(".profile-name small");
    if (name) name.textContent = username;
    if (detail) detail.textContent = "Retzef AI account";
    document.body.classList.remove("auth-locked");
  }
  function lock() {
    screen().hidden = false;
    document.body.classList.add("auth-locked");
  }
  async function syncCloud() {
    const local = window.__retzefGetChats ? window.__retzefGetChats() : [];
    await api("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chats: local }) });
    const data = await api("/api/chats");
    if (window.__retzefSetChats) window.__retzefSetChats(data.chats || []);
  }
  async function init() {
    if (ready) return;
    ready = true;
    lock();
    try {
      const data = await api("/api/auth?action=me");
      if (data.authenticated) {
        show(data.user.username);
        await syncCloud();
      }
    } catch (error) {
      $("authError").textContent = error.message;
    }
  }
  $("loginTab").addEventListener("click", () => setMode("login"));
  $("registerTab").addEventListener("click", () => setMode("register"));
  $("authForm").addEventListener("submit", async event => {
    event.preventDefault();
    const username = $("authUsername").value.trim();
    const password = $("authPassword").value;
    if (mode === "register" && password !== $("authConfirm").value) {
      $("authError").textContent = "הסיסמאות אינן תואמות.";
      return;
    }
    $("authSubmit").disabled = true;
    $("authError").textContent = "";
    try {
      const data = await api("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode === "register" ? "register" : "login", username, password }) });
      show(data.user.username);
      await syncCloud();
    } catch (error) {
      $("authError").textContent = error.message;
    } finally {
      $("authSubmit").disabled = false;
    }
  });
  async function logout() {
    await api("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    const settings = $("settingsScreen");
    if (settings) settings.hidden = true;
    lock();
  }
  const logoutButton = $("logoutBtn");
  if (logoutButton) logoutButton.addEventListener("click", () => logout().catch(error => { $("authError").textContent = error.message; lock(); }));
  window.RetzefAuth = { onAppReady: init, logout };
  setMode("login");
})();
