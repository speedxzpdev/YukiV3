const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const contentEl = document.getElementById("content");
const tabsEl = document.getElementById("tabs");

const views = {
  profile: document.getElementById("viewProfile"),
  bolao: document.getElementById("viewBolao"),
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
  announcementPreview: null,
  bolao: {
    loading: false,
    canManage: false,
    balance: 0,
    stats: {},
    games: [],
    selectedGameId: null,
    selectedGame: null,
    details: null
  }
};

const tabDefs = [
  {id: "profile", label: "Perfil"},
  {id: "bolao", label: "Bolao"},
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

function formatDateTime(value) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toDateTimeLocal(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 3 * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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

function setSelectedBolaoGame(gameId) {
  const games = state.bolao.games || [];
  if (gameId && games.some((game) => game.id === gameId || game.code === gameId)) {
    const game = games.find((item) => item.id === gameId || item.code === gameId);
    state.bolao.selectedGameId = game.id;
    state.bolao.selectedGame = game;
    return;
  }

  if (!state.bolao.selectedGameId || !games.some((game) => game.id === state.bolao.selectedGameId)) {
    const open = games.find((game) => game.status === "open");
    const pending = games.find((game) => ["scheduled", "closed", "awaiting_result", "result_pending_confirmation"].includes(game.status));
    state.bolao.selectedGameId = (open || pending || games[0])?.id || null;
  }

  state.bolao.selectedGame = games.find((game) => game.id === state.bolao.selectedGameId) || null;
}

async function loadBolaoSummary(preferredGameId = null) {
  state.bolao.loading = true;
  const data = await api("/auth/panel/bolao");
  state.bolao.canManage = !!data.canManage;
  state.bolao.balance = data.balance || 0;
  state.bolao.stats = data.stats || {};
  state.bolao.games = data.games || [];
  setSelectedBolaoGame(preferredGameId);
  state.bolao.loading = false;

  if (state.bolao.selectedGameId) {
    await loadBolaoDetails(state.bolao.selectedGameId);
  }
}

async function loadBolaoDetails(gameId = state.bolao.selectedGameId) {
  if (!gameId) {
    state.bolao.details = null;
    return null;
  }

  state.bolao.details = await api(`/auth/panel/bolao/${encodeURIComponent(gameId)}`);
  const detailGame = state.bolao.details?.game;
  if (detailGame) {
    const index = state.bolao.games.findIndex((game) => game.id === detailGame.id);
    if (index >= 0) state.bolao.games[index] = detailGame;
    else state.bolao.games.unshift(detailGame);
    state.bolao.selectedGameId = detailGame.id;
    state.bolao.selectedGame = detailGame;
  }
  return state.bolao.details;
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

function renderBolao() {
  if (state.bolao.loading && !state.bolao.games.length) {
    views.bolao.innerHTML = loadingPanel("Bolao");
    return;
  }

  const games = state.bolao.games || [];
  const selected = state.bolao.selectedGame;
  const detail = state.bolao.details;

  views.bolao.innerHTML = `
    <section class="bolao-hero liquid">
      <div class="pitch-lines" aria-hidden="true"></div>
      <div class="bolao-title">
        <p class="eyebrow">Moedas em campo</p>
        <h2>Bolao</h2>
        <p class="muted">Placar exato, aposta editavel e pagamento travado por confirmacao.</p>
      </div>
      <div class="bolao-kpis">
        ${bolaoKpi("Saldo", formatMoney(state.bolao.balance))}
        ${bolaoKpi("Abertos", formatNumber(state.bolao.stats.openGames))}
        ${bolaoKpi("Em jogo", formatNumber(state.bolao.stats.pendingResults))}
      </div>
    </section>

    <section class="bolao-layout">
      <aside class="liquid bolao-rail">
        <div class="section-head">
          <div>
            <p class="eyebrow">Rodadas</p>
            <h3>Jogos</h3>
          </div>
          <span class="count">${games.length}</span>
        </div>
        <div class="bolao-game-list">
          ${games.length ? games.map(renderBolaoGameButton).join("") : '<p class="empty">Nenhum jogo cadastrado ainda.</p>'}
        </div>
      </aside>

      <div class="bolao-main">
        ${selected ? renderBolaoFocus(selected, detail) : renderBolaoEmpty()}
        ${state.bolao.canManage ? renderBolaoAdmin(selected) : ""}
      </div>
    </section>
  `;
}

function bolaoKpi(label, value) {
  return `
    <span class="bolao-kpi">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value)}</strong>
    </span>
  `;
}

function bolaoStatusClass(status) {
  if (status === "open") return "live";
  if (["paid", "refunded"].includes(status)) return "done";
  if (["closed", "awaiting_result", "result_pending_confirmation", "paying"].includes(status)) return "locked";
  if (status === "cancelled") return "bad";
  return "idle";
}

function renderBolaoGameButton(game) {
  return `
    <button class="bolao-game ${game.id === state.bolao.selectedGameId ? "active" : ""}" data-bolao-game="${escapeHtml(game.id)}" type="button">
      <span>
        <strong>${escapeHtml(game.title)}</strong>
        <small>${escapeHtml(game.code)} · ${formatDateTime(game.startsAt)}</small>
      </span>
      <em class="${bolaoStatusClass(game.status)}">${escapeHtml(game.statusLabel)}</em>
    </button>
  `;
}

function renderBolaoFocus(game, detail) {
  const userBet = detail?.game?.userBet || game.userBet;
  const bets = detail?.bets || [];
  const leaderboard = detail?.leaderboard || [];

  return `
    <section class="liquid bolao-ticket">
      <div class="ticket-glow" aria-hidden="true"></div>
      <div class="bolao-match-head">
        <div>
          <p class="eyebrow">${escapeHtml(game.competition || "Copa")}</p>
          <h2>${escapeHtml(game.homeTeam)} <span>x</span> ${escapeHtml(game.awayTeam)}</h2>
        </div>
        <span class="bolao-status ${bolaoStatusClass(game.status)}">${escapeHtml(game.statusLabel)}</span>
      </div>

      <div class="match-strip">
        <span><strong>${formatDateTime(game.startsAt)}</strong><small>Jogo</small></span>
        <span><strong>${formatDateTime(game.bettingClosesAt)}</strong><small>Fecha</small></span>
        <span><strong>${formatMoney(game.pool || 0)}</strong><small>Pool</small></span>
        <span><strong>${formatNumber(game.bets || 0)}</strong><small>Apostas</small></span>
      </div>

      ${renderBolaoBetForm(game, userBet)}
      ${renderBolaoBetLists(game, bets, leaderboard)}
    </section>
  `;
}

function renderBolaoBetForm(game, userBet) {
  const disabled = !game.canBet;
  const homeValue = userBet?.homeScore ?? "";
  const awayValue = userBet?.awayScore ?? "";
  const stakeValue = userBet?.stake || 100;

  return `
    <form id="bolaoBetForm" class="bolao-bet ${disabled ? "disabled" : ""}" data-game-id="${escapeHtml(game.id)}">
      <div>
        <p class="eyebrow">${userBet ? "Seu bilhete" : "Nova aposta"}</p>
        <h3>${userBet ? `${escapeHtml(userBet.score)} · ${formatMoney(userBet.stake)} moedas` : "Cravar placar"}</h3>
        <p class="muted">${disabled ? "Apostas fechadas para esta partida." : "Voce pode editar ate a janela fechar."}</p>
      </div>
      <div class="score-editor">
        <label><span>${escapeHtml(game.homeTeam)}</span><input id="bolaoHomeScore" type="number" min="0" max="30" value="${escapeHtml(homeValue)}" ${disabled ? "disabled" : ""}></label>
        <strong>x</strong>
        <label><span>${escapeHtml(game.awayTeam)}</span><input id="bolaoAwayScore" type="number" min="0" max="30" value="${escapeHtml(awayValue)}" ${disabled ? "disabled" : ""}></label>
        <label><span>Moedas</span><input id="bolaoStake" type="number" min="100" step="1" value="${escapeHtml(stakeValue)}" ${disabled ? "disabled" : ""}></label>
        <button class="primary-button" type="submit" ${disabled ? "disabled" : ""}>${userBet ? "Atualizar" : "Apostar"}</button>
      </div>
      <p id="bolaoBetMessage" class="form-message"></p>
    </form>
  `;
}

function renderBolaoBetLists(game, bets, leaderboard) {
  const preview = game.payoutPreview || {};
  const previewHtml = ["result_pending_confirmation", "paying", "paid", "refunded"].includes(game.status) ? `
    <div class="bolao-preview">
      <p class="eyebrow">Preview</p>
      <h3>${preview.winnerCount ? `${preview.winnerCount} ganhadores` : "Reembolso geral"}</h3>
      <p class="muted">Pool ${formatMoney(preview.pool)} · pagamento ${formatMoney(preview.totalPayout || preview.pool)}</p>
    </div>
  ` : "";

  const list = leaderboard.length ? leaderboard : bets;
  const rows = list.length ? list.slice(0, 10).map((item) => `
    <article class="bolao-row">
      <span>${escapeHtml(item.name || "Sem nome")}</span>
      <strong>${escapeHtml(item.score || "oculto")}</strong>
      <em>${formatMoney(item.paidAmount || item.stake || 0)}</em>
    </article>
  `).join("") : '<p class="empty">As apostas aparecem aqui quando houver dados liberados.</p>';

  return `
    <div class="bolao-bottom">
      ${previewHtml}
      <div class="bolao-table">
        <div class="section-head">
          <div>
            <p class="eyebrow">${leaderboard.length ? "Resultado" : "Movimento"}</p>
            <h3>${leaderboard.length ? "Ranking" : "Apostas"}</h3>
          </div>
        </div>
        ${rows}
      </div>
    </div>
  `;
}

function renderBolaoAdmin(selected) {
  const resultDisabled = !selected || !["closed", "awaiting_result", "result_pending_confirmation"].includes(selected.status);

  return `
    <section class="bolao-admin">
      <form id="bolaoCreateForm" class="liquid bolao-admin-panel">
        <p class="eyebrow">Dono</p>
        <h3>Criar jogo</h3>
        <div class="bolao-admin-grid">
          <label><span>Mandante</span><input id="bolaoCreateHome" required placeholder="Brasil"></label>
          <label><span>Visitante</span><input id="bolaoCreateAway" required placeholder="Argentina"></label>
          <label><span>Data</span><input id="bolaoCreateStart" type="datetime-local" required value="${escapeHtml(toDateTimeLocal())}"></label>
          <label><span>Competicao</span><input id="bolaoCreateCompetition" value="Copa do Mundo"></label>
        </div>
        <button class="primary-button" type="submit">Agendar</button>
        <p id="bolaoCreateMessage" class="form-message"></p>
      </form>

      <form id="bolaoResultForm" class="liquid bolao-admin-panel ${resultDisabled ? "disabled" : ""}" data-game-id="${escapeHtml(selected?.id || "")}">
        <p class="eyebrow">Resultado</p>
        <h3>${selected ? escapeHtml(selected.title) : "Selecione um jogo"}</h3>
        <div class="score-editor compact">
          <label><span>Casa</span><input id="bolaoResultHome" type="number" min="0" max="30" ${resultDisabled ? "disabled" : ""}></label>
          <strong>x</strong>
          <label><span>Fora</span><input id="bolaoResultAway" type="number" min="0" max="30" ${resultDisabled ? "disabled" : ""}></label>
          <button class="ghost-button" type="submit" ${resultDisabled ? "disabled" : ""}>Preview</button>
        </div>
        <button id="bolaoConfirmPayout" class="danger-button" type="button" data-game-id="${escapeHtml(selected?.id || "")}" ${selected?.status === "result_pending_confirmation" ? "" : "disabled"}>Confirmar pagamento</button>
        <p id="bolaoResultMessage" class="form-message"></p>
      </form>
    </section>
  `;
}

function renderBolaoEmpty() {
  return `
    <section class="liquid empty-panel">
      <p class="eyebrow">Bolao</p>
      <h2>Nenhum jogo</h2>
      <p class="muted">Quando a Yuki abrir uma rodada, ela aparece aqui.</p>
    </section>
  `;
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
          ${toggleControl("bolao", "Bolao", config.bolao)}
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
  renderBolao();
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

  if (tabId === "bolao") {
    renderAll();
    await loadBolaoSummary();
  }

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

async function selectBolaoGame(gameId) {
  setSelectedBolaoGame(gameId);
  state.bolao.details = null;
  renderAll();
  await loadBolaoDetails(state.bolao.selectedGameId);
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
    events: form.querySelector('[name="events"]').checked,
    bolao: form.querySelector('[name="bolao"]').checked
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

async function submitBolaoBet(event) {
  event.preventDefault();
  const form = event.target;
  const gameId = form.dataset.gameId;
  const message = document.getElementById("bolaoBetMessage");
  if (message) message.textContent = "Registrando...";

  await api(`/auth/panel/bolao/${encodeURIComponent(gameId)}/bets`, {
    method: "POST",
    mutate: true,
    body: {
      name: state.user?.name || "Sem nome",
      homeScore: Number(document.getElementById("bolaoHomeScore").value),
      awayScore: Number(document.getElementById("bolaoAwayScore").value),
      amount: Number(document.getElementById("bolaoStake").value)
    }
  });

  await loadBolaoSummary(gameId);
  renderAll();
  setStatus("Aposta salva", "ok");
}

async function submitBolaoCreate(event) {
  event.preventDefault();
  const message = document.getElementById("bolaoCreateMessage");
  if (message) message.textContent = "Agendando...";

  const created = await api("/auth/panel/bolao/games", {
    method: "POST",
    mutate: true,
    body: {
      homeTeam: document.getElementById("bolaoCreateHome").value,
      awayTeam: document.getElementById("bolaoCreateAway").value,
      startsAt: document.getElementById("bolaoCreateStart").value.replace("T", " "),
      competition: document.getElementById("bolaoCreateCompetition").value
    }
  });

  await loadBolaoSummary(created.game?.id);
  renderAll();
  setStatus("Jogo agendado", "ok");
}

async function submitBolaoResult(event) {
  event.preventDefault();
  const form = event.target;
  const gameId = form.dataset.gameId;
  if (!gameId) return;

  const message = document.getElementById("bolaoResultMessage");
  if (message) message.textContent = "Calculando...";

  await api(`/auth/panel/bolao/${encodeURIComponent(gameId)}/result`, {
    method: "POST",
    mutate: true,
    body: {
      homeScore: Number(document.getElementById("bolaoResultHome").value),
      awayScore: Number(document.getElementById("bolaoResultAway").value)
    }
  });

  await loadBolaoSummary(gameId);
  renderAll();
  setStatus("Preview pronto", "ok");
}

async function confirmBolaoPayout(gameId) {
  const ok = await confirmAction("Pagar bolao", "Confirmar pagamento ou reembolso deste jogo?");
  if (!ok) return;

  await api(`/auth/panel/bolao/${encodeURIComponent(gameId)}/payout`, {
    method: "POST",
    mutate: true,
    body: {}
  });

  await loadBolaoSummary(gameId);
  renderAll();
  setStatus("Pagamento confirmado", "ok");
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

    const bolaoGameButton = event.target.closest("[data-bolao-game]");
    if (bolaoGameButton) {
      await selectBolaoGame(bolaoGameButton.dataset.bolaoGame);
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

    if (event.target.id === "bolaoConfirmPayout") {
      await confirmBolaoPayout(event.target.dataset.gameId);
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

    if (event.target.id === "bolaoBetForm") {
      await submitBolaoBet(event);
    }

    if (event.target.id === "bolaoCreateForm") {
      await submitBolaoCreate(event);
    }

    if (event.target.id === "bolaoResultForm") {
      await submitBolaoResult(event);
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
    const bolaoHash = window.location.hash.match(/^#bolao\/([^?#]+)/);
    const bolaoGameId = bolaoHash ? decodeURIComponent(bolaoHash[1]) : null;

    if (token) {
      setStatus("Entrando...");
      await loginWithToken(token);
    }

    setStatus("Carregando...");
    await loadMe();
    if (bolaoGameId) state.activeTab = "bolao";
    if (state.activeTab === "bolao") {
      await loadBolaoSummary(bolaoGameId);
    }
    renderAll();
    if (state.activeTab !== "bolao") {
      loadBolaoSummary()
        .then(() => renderAll())
        .catch((err) => {
          console.warn("Nao foi possivel carregar bolao:", err);
        });
    }
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
