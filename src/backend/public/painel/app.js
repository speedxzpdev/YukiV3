const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const contentEl = document.getElementById("content");
const searchEl = document.getElementById("groupSearch");
const segmentEls = Array.from(document.querySelectorAll(".segment"));

let currentGroups = [];
let currentFilter = "all";

function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`.trim();
}

function showError(text) {
  errorEl.textContent = text;
  errorEl.classList.remove("hidden");
  contentEl.classList.add("hidden");
  setStatus("Erro", "error");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function formatMoney(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 1000000) {
    return number.toLocaleString("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1
    });
  }

  return number.toLocaleString("pt-BR", {
    maximumFractionDigits: 0
  });
}

function formatDate(value) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR");
}

async function loginWithToken(token) {
  const response = await fetch("/auth/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    credentials: "include",
    body: JSON.stringify({token})
  });

  if (!response.ok) {
    throw new Error("Link invalido ou expirado. Gere outro link no WhatsApp com /painel.");
  }

  window.history.replaceState({}, document.title, "/painel");
}

async function loadMe() {
  const response = await fetch("/auth/me", {credentials: "include"});

  if (!response.ok) {
    throw new Error("Voce nao esta logado. Gere outro link no WhatsApp com /painel.");
  }

  return response.json();
}

function setChip(id, active, onText, offText) {
  const el = document.getElementById(id);
  el.textContent = active ? onText : offText;
  el.className = `chip ${active ? "ok" : "off"}`;
}

function render(data) {
  const { user, groups } = data;
  const vipActive = user.isVip && (!user.vencimentoVip || new Date(user.vencimentoVip).getTime() >= Date.now());
  currentGroups = groups;

  document.getElementById("userName").textContent = user.name || "Sem nome";
  document.getElementById("userLid").textContent = user.userLid;
  document.getElementById("money").textContent = formatMoney(user.dinheiro);
  document.getElementById("level").textContent = formatNumber(user.level);
  document.getElementById("xp").textContent = `${formatNumber(user.xp)} / ${formatNumber(user.proximolevel)}`;
  document.getElementById("commands").textContent = formatNumber(user.cmdCount);
  document.getElementById("downloads").textContent = formatNumber(user.downloads);
  document.getElementById("stickers").textContent = formatNumber(user.figurinhas);

  const vipEl = document.getElementById("vipState");
  vipEl.textContent = vipActive ? `VIP ate ${formatDate(user.vencimentoVip)}` : "VIP inativo";
  vipEl.className = `vip ${vipActive ? "ok" : "off"}`;

  setChip("discordChip", user.discordConnected, user.discordName ? `Discord: ${user.discordName}` : "Discord conectado", "Discord off");
  setChip("spotifyChip", user.spotifyConnected, "Spotify conectado", "Spotify off");

  renderGroups();
  errorEl.classList.add("hidden");
  contentEl.classList.remove("hidden");
  setStatus("Online", "ok");
}

function matchesFilter(group) {
  if (currentFilter === "muted") return group.muted;
  if (currentFilter === "warned") return group.advertencias > 0;
  if (currentFilter === "admin") return group.isAdminRegistered;
  return true;
}

function renderGroups() {
  const groupsEl = document.getElementById("groups");
  const query = searchEl.value.trim().toLowerCase();
  const visibleGroups = currentGroups.filter((group) => {
    const haystack = `${group.name} ${group.groupId}`.toLowerCase();
    return matchesFilter(group) && (!query || haystack.includes(query));
  });

  document.getElementById("groupCount").textContent = `${visibleGroups.length} de ${currentGroups.length}`;

  if (!visibleGroups.length) {
    groupsEl.innerHTML = '<p class="empty">Nenhum grupo nesse filtro.</p>';
    return;
  }

  groupsEl.innerHTML = visibleGroups.map((group) => `
    <article class="group">
      <div>
        <h3>${escapeHtml(group.name)}</h3>
        <p class="muted">${escapeHtml(group.groupId)}</p>
      </div>
      <div class="group-meta">
        ${group.isAdminRegistered ? '<span class="badge ok">admin registrado</span>' : '<span class="badge">sem admin salvo</span>'}
        ${group.muted ? `<span class="badge bad">mutado (${group.muteAttempts})</span>` : '<span class="badge ok">nao mutado</span>'}
        ${group.advertencias ? `<span class="badge warn">${group.advertencias} adv</span>` : '<span class="badge ok">sem adv</span>'}
        <span class="badge">${formatNumber(group.messages)} msgs</span>
        <span class="badge">${formatNumber(group.commands)} cmds</span>
      </div>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function boot() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      setStatus("Entrando...");
      await loginWithToken(token);
    }

    setStatus("Carregando...");
    const data = await loadMe();
    render(data);
  } catch (err) {
    showError(err.message || "Nao foi possivel abrir o painel.");
  }
}

searchEl.addEventListener("input", renderGroups);

for (const segment of segmentEls) {
  segment.addEventListener("click", () => {
    currentFilter = segment.dataset.filter;
    for (const item of segmentEls) item.classList.toggle("active", item === segment);
    renderGroups();
  });
}

boot();
