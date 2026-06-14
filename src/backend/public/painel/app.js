const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const contentEl = document.getElementById("content");
const tabsEl = document.getElementById("tabs");

const views = {
  profile: document.getElementById("viewProfile"),
  groups: document.getElementById("viewGroups"),
  config: document.getElementById("viewConfig"),
  moderation: document.getElementById("viewModeration"),
  ops: document.getElementById("viewOps"),
  announcements: document.getElementById("viewAnnouncements")
};

const state = {
  activeTab: "profile",
  csrfToken: null,
  user: null,
  permissions: {},
  groups: [],
  ops: {},
  selectedGroupId: null,
  selectedGroup: null,
  groupDetails: null,
  announcementPreview: null
};

const tabDefs = [
  {id: "profile", label: "Perfil"},
  {id: "groups", label: "Grupos"},
  {id: "config", label: "Config", needsGroup: true},
  {id: "moderation", label: "Moderacao", needsGroup: true},
  {id: "ops", label: "Ops", needsOps: true},
  {id: "announcements", label: "Anuncios", needsAnnouncements: true}
];

const REQUEST_TIMEOUT_MS = 15 * 1000;

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

function clearError() {
  errorEl.classList.add("hidden");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function formatMoney(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 1000000) {
    return number.toLocaleString("pt-BR", {notation: "compact", maximumFractionDigits: 1});
  }
  return number.toLocaleString("pt-BR", {maximumFractionDigits: 0});
}

function formatDate(value) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR");
}

function canManageSelectedGroup() {
  return !!state.selectedGroup?.canManage;
}

function visibleTabs() {
  return tabDefs.filter((tab) => {
    if (tab.needsOps) return !!state.permissions.canUseOps;
    if (tab.needsAnnouncements) return !!state.permissions.canUseAnnouncements;
    if (tab.needsGroup) return state.groups.some((group) => group.canManage);
    return true;
  });
}

async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.mutate) {
    headers["X-CSRF-Token"] = state.csrfToken || "";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(path, {
      method: options.method || "GET",
      credentials: "include",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("A Yuki demorou para responder. Tente de novo.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = "Nao foi possivel concluir.";
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
}

async function loginWithToken(token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch("/auth/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify({token}),
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Login demorou para responder. Gere outro link e tente de novo.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error("Link invalido ou expirado. Gere outro link no WhatsApp com /painel.");
  }

  window.history.replaceState({}, document.title, "/painel");
}

async function loadMe() {
  const data = await api("/auth/me");
  state.csrfToken = data.csrfToken;
  state.user = data.user;
  state.permissions = data.permissions || {};
  state.groups = data.groups || [];
  state.ops = data.ops || {};

  if (!state.selectedGroupId || !state.groups.some((group) => group.groupId === state.selectedGroupId)) {
    const manageable = state.groups.find((group) => group.canManage);
    state.selectedGroupId = manageable?.groupId || state.groups[0]?.groupId || null;
  }

  state.selectedGroup = state.groups.find((group) => group.groupId === state.selectedGroupId) || null;
}

function mergeGroups(nextGroups) {
  const map = new Map(state.groups.map((group) => [group.groupId, group]));
  for (const group of nextGroups || []) {
    map.set(group.groupId, {...(map.get(group.groupId) || {}), ...group});
  }

  state.groups = Array.from(map.values());
  if (!state.selectedGroupId || !state.groups.some((group) => group.groupId === state.selectedGroupId)) {
    const manageable = state.groups.find((group) => group.canManage);
    state.selectedGroupId = manageable?.groupId || state.groups[0]?.groupId || null;
  }
  state.selectedGroup = state.groups.find((group) => group.groupId === state.selectedGroupId) || null;
}

async function loadManageableGroups(query = "") {
  if (!state.permissions.canManageAnyGroup && !state.groups.some((group) => group.canManage)) return;
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  const data = await api(`/auth/panel/groups${suffix}`);
  mergeGroups(data.groups || []);
}

async function loadGroupDetails(force = false) {
  if (!state.selectedGroupId || !canManageSelectedGroup()) {
    state.groupDetails = null;
    return null;
  }

  if (!force && state.groupDetails?.group?.groupId === state.selectedGroupId) return state.groupDetails;

  setStatus("Sincronizando...");
  state.groupDetails = await api(`/auth/panel/groups/${encodeURIComponent(state.selectedGroupId)}`);
  setStatus("Online", "ok");
  return state.groupDetails;
}

function renderShell() {
  document.getElementById("roleBadge").textContent = state.user.roleLabel || "Usuario";
  document.getElementById("roleBadge").className = `role-badge ${state.user.role || "user"}`;

  tabsEl.innerHTML = visibleTabs().map((tab) => `
    <button class="tab-button ${state.activeTab === tab.id ? "active" : ""}" data-tab="${tab.id}" type="button">
      ${escapeHtml(tab.label)}
    </button>
  `).join("");

  for (const [id, view] of Object.entries(views)) {
    view.classList.toggle("active", id === state.activeTab);
  }
}

function renderProfile() {
  const user = state.user;
  const vipActive = user.isVip && (!user.vencimentoVip || new Date(user.vencimentoVip).getTime() >= Date.now());
  const managedCount = state.groups.filter((group) => group.canManage).length;

  views.profile.innerHTML = `
    <section class="identity-panel liquid">
      <div>
        <p class="eyebrow">Sessao reconhecida</p>
        <h2>${escapeHtml(user.name || "Sem nome")}</h2>
        <p class="muted">${escapeHtml(user.userLid)}</p>
      </div>
      <div class="identity-stack">
        <span class="vip ${vipActive ? "ok" : "off"}">${vipActive ? `VIP ate ${formatDate(user.vencimentoVip)}` : "VIP inativo"}</span>
        <span class="role-chip ${escapeHtml(user.role)}">${escapeHtml(user.roleLabel || "Usuario")}</span>
      </div>
    </section>

    <section class="metrics-grid">
      ${metric("Dinheiro", formatMoney(user.dinheiro), true)}
      ${metric("Level", formatNumber(user.level))}
      ${metric("XP", `${formatNumber(user.xp)} / ${formatNumber(user.proximolevel)}`)}
      ${metric("Comandos", formatNumber(user.cmdCount))}
      ${metric("Downloads", formatNumber(user.downloads))}
      ${metric("Figurinhas", formatNumber(user.figurinhas))}
    </section>

    <section class="profile-split">
      <div class="liquid quiet-panel">
        <p class="eyebrow">Acesso</p>
        <h3>${managedCount ? `${managedCount} grupos gerenciaveis` : "Conta comum"}</h3>
        <p class="muted">${accessCopy(user.role, managedCount)}</p>
      </div>
      <div class="liquid quiet-panel">
        <p class="eyebrow">Perfil</p>
        <h3>${formatNumber(user.waifus)} waifus</h3>
        <p class="muted">${formatNumber(user.conquistas)} conquistas registradas.</p>
      </div>
    </section>
  `;
}

function metric(label, value, accent = false) {
  return `
    <article class="metric liquid ${accent ? "accent" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function accessCopy(role, managedCount) {
  if (role === "owner") return "Acesso total da Yuki. Acoes sensiveis ficam auditadas.";
  if (role === "subowner") return "Staff operacional. Acoes ficam abaixo dos donos reais.";
  if (managedCount) return "Admin de grupo com acoes liberadas nos grupos onde voce ainda e admin.";
  return "Seu painel mostra dados pessoais e status nos grupos.";
}

function renderGroups() {
  const managed = state.groups.filter((group) => group.canManage).length;
  views.groups.innerHTML = `
    <section class="workspace-grid">
      <div class="liquid group-list-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">Contexto</p>
            <h2>Grupos</h2>
          </div>
          <span class="count">${managed}/${state.groups.length}</span>
        </div>
        <input id="groupSearch" class="search-input" type="search" placeholder="Buscar grupo">
        <div id="groupList" class="group-list"></div>
      </div>
      <div class="liquid group-focus">
        ${renderSelectedGroupSummary()}
      </div>
    </section>
  `;

  renderGroupList("");
}

function renderGroupList(query) {
  const list = document.getElementById("groupList");
  if (!list) return;

  const normalized = String(query || "").toLowerCase();
  const groups = state.groups.filter((group) => `${group.name} ${group.groupId}`.toLowerCase().includes(normalized));

  list.innerHTML = groups.length ? groups.map((group) => `
    <button class="group-row ${group.groupId === state.selectedGroupId ? "active" : ""}" data-group-id="${escapeHtml(group.groupId)}" type="button">
      <span>
        <strong>${escapeHtml(group.name)}</strong>
        <small>${escapeHtml(group.groupId)}</small>
      </span>
      <em class="${group.canManage ? "ok-text" : ""}">${group.canManage ? "gerenciar" : group.muted ? "mutado" : "ver"}</em>
    </button>
  `).join("") : '<p class="empty">Nenhum grupo encontrado.</p>';
}

function renderSelectedGroupSummary() {
  const group = state.selectedGroup;
  if (!group) {
    return `
      <p class="eyebrow">Selecionado</p>
      <h2>Nenhum grupo</h2>
      <p class="muted">Use a Yuki em um grupo para ele aparecer aqui.</p>
    `;
  }

  return `
    <p class="eyebrow">Selecionado</p>
    <h2>${escapeHtml(group.name)}</h2>
    <p class="muted break">${escapeHtml(group.groupId)}</p>
    <div class="status-matrix">
      <span>${group.canManage ? "Gerenciavel" : "Leitura"}</span>
      <span>${group.muted ? `Mutado (${group.muteAttempts})` : "Nao mutado"}</span>
      <span>${group.advertencias ? `${group.advertencias} adv` : "Sem adv"}</span>
      <span>${formatNumber(group.messages)} msgs</span>
      <span>${formatNumber(group.commands)} cmds</span>
      <span>Aluguel ${formatDate(group.aluguel)}</span>
    </div>
    ${group.canManage ? '<button class="primary-button" data-tab="config" type="button">Abrir controles</button>' : '<p class="muted">Sem permissao administrativa ao vivo para esse grupo.</p>'}
  `;
}

function renderConfig() {
  const detail = state.groupDetails;
  if (!state.selectedGroup || !canManageSelectedGroup()) {
    views.config.innerHTML = emptyPanel("Config", "Selecione um grupo gerenciavel.");
    return;
  }

  if (!detail) {
    views.config.innerHTML = loadingPanel("Config");
    return;
  }

  const config = detail.group.configs;
  views.config.innerHTML = `
    <section class="liquid control-surface">
      <div class="section-head">
        <div>
          <p class="eyebrow">Grupo</p>
          <h2>${escapeHtml(detail.group.name)}</h2>
        </div>
        <span class="count">${formatNumber(detail.group.participantCount)} membros</span>
      </div>

      <form id="configForm">
        <div class="toggle-grid">
          ${toggleControl("welcome", "Welcome", config.welcome)}
          ${toggleControl("antilink", "Anti-link", config.antlink)}
          ${toggleControl("brincadeira", "Brincadeira", config.cmdFun)}
          ${toggleControl("autoReply", "Auto resposta", config.autoReply)}
          ${toggleControl("autoDownload", "Auto download", config.autoDownload)}
          ${toggleControl("antiTotag", "Anti marcar", config.antiTotag)}
          ${toggleControl("events", "Eventos", config.events)}
        </div>

        <div class="prefix-row">
          <label>
            <span>Prefixo</span>
            <input id="prefixInput" maxlength="1" value="${escapeHtml(config.prefixo || "/")}">
          </label>
          <button class="primary-button" type="submit">Salvar config</button>
        </div>
      </form>
      <p id="configMessage" class="form-message"></p>
    </section>
  `;
}

function toggleControl(name, label, checked) {
  return `
    <label class="liquid-toggle">
      <input type="checkbox" name="${escapeHtml(name)}" ${checked ? "checked" : ""}>
      <span>${escapeHtml(label)}</span>
      <em>${checked ? "On" : "Off"}</em>
    </label>
  `;
}

function renderModeration() {
  const detail = state.groupDetails;
  if (!state.selectedGroup || !canManageSelectedGroup()) {
    views.moderation.innerHTML = emptyPanel("Moderacao", "Selecione um grupo gerenciavel.");
    return;
  }

  if (!detail) {
    views.moderation.innerHTML = loadingPanel("Moderacao");
    return;
  }

  views.moderation.innerHTML = `
    <section class="workspace-grid moderation-layout">
      <div class="liquid member-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">Membros</p>
            <h2>${escapeHtml(detail.group.name)}</h2>
          </div>
          <span class="count">${detail.members.length}</span>
        </div>
        <input id="memberSearch" class="search-input" type="search" placeholder="Buscar membro">
        <div id="memberList" class="member-list"></div>
      </div>
      <div class="liquid quiet-panel">
        <p class="eyebrow">Grupo</p>
        <h3>Acoes rapidas</h3>
        <div class="action-stack">
          <button class="ghost-button" data-group-action="open" type="button">Abrir grupo</button>
          <button class="ghost-button" data-group-action="close" type="button">Fechar grupo</button>
        </div>
        <p class="muted">Todas as acoes consultam o WhatsApp na hora e ficam no log.</p>
      </div>
    </section>
  `;

  renderMemberList("");
}

function renderMemberList(query) {
  const list = document.getElementById("memberList");
  if (!list || !state.groupDetails) return;

  const normalized = String(query || "").toLowerCase();
  const members = state.groupDetails.members
    .filter((member) => `${member.name} ${member.userLid}`.toLowerCase().includes(normalized))
    .sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || b.messages - a.messages);

  list.innerHTML = members.length ? members.map((member) => `
    <article class="member-row">
      <div>
        <strong>${escapeHtml(member.name)}</strong>
        <small>${escapeHtml(member.userLid)}</small>
        <span class="member-badges">
          <em>${escapeHtml(member.role)}</em>
          ${member.muted ? "<em>mutado</em>" : ""}
          ${member.advertencias ? `<em>${member.advertencias} adv</em>` : ""}
          <em>${formatNumber(member.messages)} msgs</em>
        </span>
      </div>
      <div class="member-actions">
        <button data-member-action="${member.muted ? "unmute" : "mute"}" data-target="${escapeHtml(member.userLid)}" type="button">${member.muted ? "Desmutar" : "Mutar"}</button>
        <button data-member-action="warn" data-target="${escapeHtml(member.userLid)}" type="button">Adv</button>
        <button data-member-action="unwarn" data-target="${escapeHtml(member.userLid)}" type="button">Rm adv</button>
        <button data-member-action="promote" data-target="${escapeHtml(member.userLid)}" type="button">Promover</button>
        <button data-member-action="demote" data-target="${escapeHtml(member.userLid)}" type="button">Rebaixar</button>
        <button class="danger-link" data-member-action="ban" data-target="${escapeHtml(member.userLid)}" type="button">Ban</button>
      </div>
    </article>
  `).join("") : '<p class="empty">Nenhum membro encontrado.</p>';
}

function renderOps() {
  const logs = state.ops.recentLogs || [];
  const subowners = state.ops.subowners || [];

  views.ops.innerHTML = `
    <section class="ops-grid">
      <div class="liquid ops-hero">
        <p class="eyebrow">Yuki ops</p>
        <h2>${formatNumber(state.ops.activeGroups || 0)} grupos ativos</h2>
        <p class="muted">${formatNumber(state.ops.totalGroups || 0)} grupos cadastrados. ${subowners.length} subdonos registrados.</p>
      </div>
      <div class="liquid quiet-panel">
        <p class="eyebrow">Staff</p>
        <div class="staff-list">
          ${subowners.length ? subowners.map((owner) => `<span>${escapeHtml(owner.userLid)}</span>`).join("") : "<span>Nenhum subdono.</span>"}
        </div>
      </div>
    </section>
    <section class="liquid log-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Auditoria</p>
          <h2>Ultimas acoes</h2>
        </div>
      </div>
      <div class="log-list">
        ${logs.length ? logs.map(renderLog).join("") : '<p class="empty">Nenhuma acao registrada ainda.</p>'}
      </div>
    </section>
  `;
}

function renderLog(log) {
  return `
    <article class="log-row">
      <span class="${log.status === "success" ? "ok-text" : "bad-text"}">${escapeHtml(log.status)}</span>
      <strong>${escapeHtml(log.action)}</strong>
      <small>${escapeHtml(log.groupId || "global")}</small>
      <small>${formatDate(log.createdAt)}</small>
    </article>
  `;
}

function renderAnnouncements() {
  views.announcements.innerHTML = `
    <section class="announcement-grid">
      <form id="announcementForm" class="liquid announcement-editor">
        <p class="eyebrow">Broadcast</p>
        <h2>Anuncio global</h2>
        <textarea id="announcementText" maxlength="2000" placeholder="Mensagem para os grupos ativos"></textarea>
        <div class="announcement-controls">
          <label><span>Limite</span><input id="announcementLimit" type="number" min="1" max="25" value="15"></label>
          <label><span>Delay min</span><input id="announcementMinDelay" type="number" min="10" value="20"></label>
          <label><span>Delay max</span><input id="announcementMaxDelay" type="number" min="10" value="20"></label>
        </div>
        <button class="primary-button" type="submit">Gerar preview</button>
        <p id="announcementMessage" class="form-message"></p>
      </form>
      <div id="announcementPreview" class="liquid announcement-preview">
        ${renderAnnouncementPreview()}
      </div>
    </section>
  `;
}

function renderAnnouncementPreview() {
  const preview = state.announcementPreview;
  if (!preview) {
    return `
      <p class="eyebrow">Preview</p>
      <h2>Nenhum rascunho</h2>
      <p class="muted">O envio global so libera depois do preview.</p>
    `;
  }

  return `
    <p class="eyebrow">Preview</p>
    <h2>${preview.selected}/${preview.total} grupos</h2>
    <pre>${escapeHtml(preview.message)}</pre>
    <div class="preview-groups">
      ${preview.groups.slice(0, 8).map((group) => `<span>${escapeHtml(group.name)}</span>`).join("")}
    </div>
    <button class="danger-button" id="confirmAnnouncement" type="button">Confirmar envio</button>
  `;
}

function loadingPanel(title) {
  return `
    <section class="liquid empty-panel">
      <p class="eyebrow">${escapeHtml(title)}</p>
      <h2>Sincronizando</h2>
      <p class="muted">Consultando o WhatsApp em tempo real.</p>
    </section>
  `;
}

function emptyPanel(title, text) {
  return `
    <section class="liquid empty-panel">
      <p class="eyebrow">${escapeHtml(title)}</p>
      <h2>Nada selecionado</h2>
      <p class="muted">${escapeHtml(text)}</p>
    </section>
  `;
}

function renderAll() {
  renderShell();
  renderProfile();
  renderGroups();
  renderConfig();
  renderModeration();
  renderOps();
  renderAnnouncements();
  clearError();
  contentEl.classList.remove("hidden");
  setStatus("Online", "ok");
}

async function switchTab(tabId) {
  if (!visibleTabs().some((tab) => tab.id === tabId)) return;
  state.activeTab = tabId;

  if (["config", "moderation"].includes(tabId) && canManageSelectedGroup()) {
    renderAll();
    await loadGroupDetails();
  }

  renderAll();
}

async function selectGroup(groupId) {
  state.selectedGroupId = groupId;
  state.selectedGroup = state.groups.find((group) => group.groupId === groupId) || null;
  state.groupDetails = null;
  if (state.selectedGroup?.canManage && ["config", "moderation"].includes(state.activeTab)) {
    await loadGroupDetails(true);
  }
  renderAll();
}

async function saveConfig(event) {
  event.preventDefault();
  if (!state.groupDetails) return;

  const form = event.currentTarget;
  const body = {
    prefixo: form.querySelector("#prefixInput").value,
    welcome: form.querySelector('[name="welcome"]').checked,
    antilink: form.querySelector('[name="antilink"]').checked,
    brincadeira: form.querySelector('[name="brincadeira"]').checked,
    autoReply: form.querySelector('[name="autoReply"]').checked,
    autoDownload: form.querySelector('[name="autoDownload"]').checked,
    antiTotag: form.querySelector('[name="antiTotag"]').checked,
    events: form.querySelector('[name="events"]').checked
  };

  const message = document.getElementById("configMessage");
  message.textContent = "Salvando...";
  await api(`/auth/panel/groups/${encodeURIComponent(state.selectedGroupId)}/config`, {
    method: "PATCH",
    mutate: true,
    body
  });
  state.groupDetails = null;
  await loadMe();
  await loadGroupDetails(true);
  renderAll();
}

async function runAction(action, targetLid = null) {
  const label = targetLid ? `${action} em ${targetLid}` : action;
  const ok = await confirmAction("Confirmar acao", `Executar ${label}?`);
  if (!ok) return;

  setStatus("Executando...");
  const result = await api(`/auth/panel/groups/${encodeURIComponent(state.selectedGroupId)}/actions`, {
    method: "POST",
    mutate: true,
    body: {action, targetLid}
  });

  await loadMe();
  await loadGroupDetails(true);
  renderAll();
  setStatus(result.message || "Feito", "ok");
}

function confirmAction(title, text) {
  return new Promise((resolve) => {
    const template = document.getElementById("confirmTemplate");
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector("#confirmTitle").textContent = title;
    node.querySelector("#confirmText").textContent = text;
    document.body.appendChild(node);

    node.querySelector("#confirmCancel").addEventListener("click", () => {
      node.remove();
      resolve(false);
    });

    node.querySelector("#confirmOk").addEventListener("click", () => {
      node.remove();
      resolve(true);
    });
  });
}

async function createAnnouncement(event) {
  event.preventDefault();
  const message = document.getElementById("announcementMessage");
  message.textContent = "Gerando preview...";

  const preview = await api("/auth/panel/announcements/preview", {
    method: "POST",
    mutate: true,
    body: {
      text: document.getElementById("announcementText").value,
      limit: Number(document.getElementById("announcementLimit").value),
      minDelay: Number(document.getElementById("announcementMinDelay").value),
      maxDelay: Number(document.getElementById("announcementMaxDelay").value)
    }
  });

  state.announcementPreview = preview.preview;
  renderAll();
}

async function confirmAnnouncement() {
  if (!state.announcementPreview) return;
  const ok = await confirmAction("Enviar anuncio", `Enviar para ${state.announcementPreview.selected} grupos?`);
  if (!ok) return;

  await api("/auth/panel/announcements/confirm", {
    method: "POST",
    mutate: true,
    body: {previewId: state.announcementPreview.id}
  });

  state.announcementPreview = null;
  await loadMe();
  renderAll();
  setStatus("Anuncio iniciado", "ok");
}

document.addEventListener("click", async (event) => {
  try {
    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      await switchTab(tabButton.dataset.tab);
      return;
    }

    const groupButton = event.target.closest("[data-group-id]");
    if (groupButton) {
      await selectGroup(groupButton.dataset.groupId);
      return;
    }

    const memberButton = event.target.closest("[data-member-action]");
    if (memberButton) {
      await runAction(memberButton.dataset.memberAction, memberButton.dataset.target);
      return;
    }

    const groupActionButton = event.target.closest("[data-group-action]");
    if (groupActionButton) {
      await runAction(groupActionButton.dataset.groupAction);
      return;
    }

    if (event.target.id === "confirmAnnouncement") {
      await confirmAnnouncement();
    }
  } catch (err) {
    setStatus("Erro", "error");
    errorEl.textContent = err.message || "Falha na acao.";
    errorEl.classList.remove("hidden");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "groupSearch") renderGroupList(event.target.value);
  if (event.target.id === "memberSearch") renderMemberList(event.target.value);
});

document.addEventListener("submit", async (event) => {
  try {
    if (event.target.id === "configForm") {
      await saveConfig(event);
    }

    if (event.target.id === "announcementForm") {
      await createAnnouncement(event);
    }
  } catch (err) {
    setStatus("Erro", "error");
    const message = event.target.querySelector(".form-message");
    if (message) message.textContent = err.message || "Falha ao salvar.";
  }
});

async function boot() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      setStatus("Entrando...");
      await loginWithToken(token);
    }

    setStatus("Carregando...");
    await loadMe();
    renderAll();
    loadManageableGroups()
      .then(() => renderAll())
      .catch((err) => {
        console.warn("Nao foi possivel carregar grupos globais:", err);
      });
  } catch (err) {
    showError(err.message || "Nao foi possivel abrir o painel.");
  }
}

boot();
