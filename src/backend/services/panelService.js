const crypto = require("crypto");
const { advertidos } = require("../../database/models/adverts");
const { donos } = require("../../database/models/donos");
const { grupos } = require("../../database/models/grupos");
const { mutados } = require("../../database/models/mute");
const { panelAudits } = require("../../database/models/panelAudit");
const { rankativos } = require("../../database/models/rankativos");
const { users } = require("../../database/models/users");
const { numberBot, numberBotJid, ownerLids } = require("../../config");
const {
  canModerateTarget,
  ensureGroup,
  getOwnerLevelCached,
  invalidateMute,
  setMuteCache,
  updateGroupAndCache
} = require("../../utils/dbHelpers");
const { normalizeUserLid } = require("../../utils/normalizeUserLid");

const announcementPreviews = new Map();
let runningAnnouncement = null;
let lastAnnouncementAt = 0;

const ANNOUNCEMENT_PREVIEW_TTL_MS = 10 * 60 * 1000;
const ANNOUNCEMENT_COOLDOWN_MS = 30 * 60 * 1000;
const ANNOUNCEMENT_LIMIT = 25;
const ANNOUNCEMENT_MIN_DELAY_SECONDS = 10;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isGroupId(value) {
  return typeof value === "string" && value.endsWith("@g.us");
}

function decodeGroupId(value) {
  const decoded = decodeURIComponent(String(value || ""));
  if (!isGroupId(decoded)) throw httpError(400, "grupo invalido.");
  return decoded;
}

function jidMatches(a, b) {
  if (!a || !b) return false;
  return a === b || normalizeUserLid(a) === normalizeUserLid(b);
}

function participantLid(participant) {
  return normalizeUserLid(participant?.lid || participant?.id || "");
}

function getParticipantIds(participant) {
  return [participant?.id, participant?.lid, participantLid(participant)].filter(Boolean);
}

function isParticipantAdmin(participant) {
  return !!participant?.admin;
}

function findParticipant(metadata, userLid) {
  return (metadata?.participants || []).find((participant) =>
    getParticipantIds(participant).some((id) => jidMatches(id, userLid))
  );
}

function isBotTarget(targetLid) {
  return [numberBot, numberBotJid].some((botId) => botId && jidMatches(botId, targetLid));
}

async function getRole(sender) {
  const level = await getOwnerLevelCached(sender);
  if (level >= 2) return {name: "owner", level, label: "Dono"};
  if (level === 1) return {name: "subowner", level, label: "Staff Yuki"};
  return {name: "user", level: 0, label: "Usuario"};
}

async function logPanelAction(entry) {
  try {
    await panelAudits.create(entry);
  } catch (err) {
    console.error("Erro ao salvar auditoria do painel:", err);
  }
}

async function sendGroupAuditNotice(sock, groupId, actorLid, actionLabel, targetLid) {
  const mentions = [actorLid, targetLid].filter(Boolean);
  const targetText = targetLid ? ` em @${targetLid.split("@")[0]}` : "";
  await sock.sendMessage(groupId, {
    text: `Painel Yuki: @${actorLid.split("@")[0]} executou ${actionLabel}${targetText}.`,
    mentions
  });
}

async function getLivePermission(sock, groupId, sender) {
  if (!sock) throw httpError(503, "socket da yuki indisponivel.");

  const [metadata, role] = await Promise.all([
    sock.groupMetadata(groupId),
    getRole(sender)
  ]);
  const actorParticipant = findParticipant(metadata, sender);
  const isAdmin = !!actorParticipant?.admin;

  await ensureGroup(groupId, metadata);

  return {
    metadata,
    role,
    isAdmin,
    allowed: role.level > 0 || isAdmin
  };
}

function compactGroup(group, extras = {}) {
  return {
    groupId: group.groupId,
    name: group.grupoName || "Sem nome",
    ownerId: group.ownerId || null,
    aluguel: toIso(group.aluguel),
    cmdUsados: group.cmdUsados || 0,
    configs: {
      events: group.configs?.events !== false,
      welcome: group.configs?.welcome !== false,
      antlink: !!group.configs?.antlink,
      cmdFun: !!group.configs?.cmdFun,
      cmdAdulto: !!group.configs?.cmdAdulto,
      prefixo: group.configs?.prefixo || "/",
      autoReply: group.autoReply !== false,
      autoDownload: group.autoDownload !== false,
      antiTotag: !!group.antiTotag
    },
    ...extras
  };
}

async function buildPanelHome(sender, sock) {
  const role = await getRole(sender);
  const [user, mutes, adverts, ranks, allGroups, subowners] = await Promise.all([
    users.findOne({userLid: sender}).lean(),
    mutados.find({userLid: sender}).lean(),
    advertidos.find({userLid: sender}).lean(),
    rankativos.find({userLid: sender}).lean(),
    role.level > 0 ? grupos.find({groupId: /@g\.us$/}).sort({grupoName: 1}).limit(250).lean() : Promise.resolve([]),
    role.level > 0 ? donos.find().lean() : Promise.resolve([])
  ]);

  if (!user) throw httpError(404, "usuario nao encontrado.");

  const groupIds = new Set();
  for (const group of user.grupos || []) if (isGroupId(group?.id)) groupIds.add(group.id);
  for (const mute of mutes) if (isGroupId(mute?.grupo)) groupIds.add(mute.grupo);
  for (const adv of adverts) if (isGroupId(adv?.grupo)) groupIds.add(adv.grupo);
  for (const rank of ranks) if (isGroupId(rank?.from)) groupIds.add(rank.from);
  for (const group of allGroups) groupIds.add(group.groupId);

  const groupDocs = groupIds.size
    ? await grupos.find({groupId: {$in: Array.from(groupIds)}}).lean()
    : [];

  const savedGroups = new Map((user.grupos || []).map((group) => [group.id, group]));
  const groupInfo = new Map(groupDocs.map((group) => [group.groupId, group]));
  const muteInfo = new Map(mutes.map((mute) => [mute.grupo, mute]));
  const advertInfo = new Map(adverts.map((adv) => [adv.grupo, adv]));
  const rankInfo = new Map(ranks.map((rank) => [rank.from, rank]));

  const groups = [];
  for (const groupId of groupIds) {
    const saved = savedGroups.get(groupId);
    const group = groupInfo.get(groupId) || {groupId, grupoName: saved?.nome || "Sem nome"};
    const mute = muteInfo.get(groupId);
    const adv = advertInfo.get(groupId);
    const rank = rankInfo.get(groupId);

    let isAdminLive = false;
    if (sock && role.level === 0) {
      try {
        const metadata = await sock.groupMetadata(groupId);
        isAdminLive = !!findParticipant(metadata, sender)?.admin;
      } catch {}
    }

    groups.push(compactGroup(group, {
      isAdminRegistered: !!saved,
      canManage: role.level > 0 || isAdminLive,
      managedBy: role.level > 0 ? role.name : (isAdminLive ? "admin" : "user"),
      muted: !!mute,
      muteAttempts: mute?.tentativasMsg || 0,
      advertencias: adv?.adv || 0,
      messages: rank?.msg || 0,
      commands: rank?.cmdUsados || 0
    }));
  }

  const recentLogs = role.level > 0
    ? await panelAudits.find().sort({createdAt: -1}).limit(20).lean()
    : [];

  return {
    user: {
      userLid: user.userLid,
      name: user.name,
      bio: user.bio,
      dinheiro: user.dinheiro,
      level: user.level,
      xp: user.xp,
      proximolevel: user.proximolevel,
      isVip: !!user.isVip,
      vencimentoVip: toIso(user.vencimentoVip),
      registro: toIso(user.registro),
      cmdCount: user.cmdCount,
      downloads: user.donwloads,
      figurinhas: user.figurinhas,
      waifus: Array.isArray(user.waifus) ? user.waifus.length : 0,
      conquistas: Array.isArray(user.conquistas) ? user.conquistas.length : 0,
      role: role.name,
      roleLabel: role.label,
      isRealOwner: ownerLids.some((owner) => jidMatches(owner, sender))
    },
    permissions: {
      canUseOps: role.level > 0,
      canUseAnnouncements: role.level > 0,
      canManageAnyGroup: role.level > 0
    },
    csrfToken: null,
    groups,
    ops: {
      totalGroups: role.level > 0 ? await grupos.countDocuments({groupId: /@g\.us$/}) : null,
      activeGroups: role.level > 0 ? await grupos.countDocuments({groupId: /@g\.us$/, aluguel: {$gt: new Date()}}) : null,
      subowners: subowners.map((owner) => ({
        userLid: owner.userLid,
        desc: owner.desc,
        data: toIso(owner.data)
      })),
      recentLogs: recentLogs.map((log) => ({
        id: String(log._id),
        actorLid: log.actorLid,
        actorRole: log.actorRole,
        groupId: log.groupId,
        targetLid: log.targetLid,
        action: log.action,
        status: log.status,
        message: log.message,
        createdAt: toIso(log.createdAt)
      }))
    }
  };
}

async function getGroupPanel(sock, groupId, sender) {
  const permission = await getLivePermission(sock, groupId, sender);
  if (!permission.allowed) throw httpError(403, "sem permissao para gerenciar esse grupo.");

  const [group, mutes, adverts, ranks, logs] = await Promise.all([
    grupos.findOne({groupId}).lean(),
    mutados.find({grupo: groupId}).lean(),
    advertidos.find({grupo: groupId}).lean(),
    rankativos.find({from: groupId}).lean(),
    panelAudits.find({groupId}).sort({createdAt: -1}).limit(30).lean()
  ]);

  const userIds = new Set();
  for (const participant of permission.metadata.participants || []) userIds.add(participantLid(participant));
  for (const mute of mutes) userIds.add(normalizeUserLid(mute.userLid));
  for (const adv of adverts) userIds.add(normalizeUserLid(adv.userLid));
  for (const rank of ranks) userIds.add(normalizeUserLid(rank.userLid));

  const userDocs = await users.find({userLid: {$in: Array.from(userIds)}}).select("userLid name").lean();
  const names = new Map(userDocs.map((user) => [user.userLid, user.name]));
  const muteMap = new Map(mutes.map((mute) => [normalizeUserLid(mute.userLid), mute]));
  const advMap = new Map(adverts.map((adv) => [normalizeUserLid(adv.userLid), adv]));
  const rankMap = new Map(ranks.map((rank) => [normalizeUserLid(rank.userLid), rank]));

  const members = (permission.metadata.participants || []).map((participant) => {
    const userLid = participantLid(participant);
    const mute = muteMap.get(userLid);
    const adv = advMap.get(userLid);
    const rank = rankMap.get(userLid);

    return {
      userLid,
      jid: participant.id || participant.lid || userLid,
      name: names.get(userLid) || userLid.split("@")[0],
      isAdmin: isParticipantAdmin(participant),
      isBot: isBotTarget(userLid),
      muted: !!mute,
      muteAttempts: mute?.tentativasMsg || 0,
      advertencias: adv?.adv || 0,
      messages: rank?.msg || 0,
      commands: rank?.cmdUsados || 0,
      roleLevel: awaitableRoleLevelPlaceholder(userLid)
    };
  });

  const levels = await Promise.all(members.map((member) => getOwnerLevelCached(member.userLid)));
  members.forEach((member, index) => {
    member.roleLevel = levels[index];
    member.role = levels[index] >= 2 ? "owner" : (levels[index] === 1 ? "subowner" : (member.isAdmin ? "admin" : "user"));
  });

  return {
    group: compactGroup(group || {groupId, grupoName: permission.metadata.subject || "Sem nome"}, {
      subject: permission.metadata.subject || group?.grupoName || "Sem nome",
      participantCount: permission.metadata.participants?.length || 0,
      actor: {
        role: permission.role.name,
        roleLabel: permission.role.label,
        isAdmin: permission.isAdmin,
        canManage: permission.allowed
      }
    }),
    members,
    logs: logs.map((log) => ({
      id: String(log._id),
      actorLid: log.actorLid,
      actorRole: log.actorRole,
      targetLid: log.targetLid,
      action: log.action,
      status: log.status,
      message: log.message,
      createdAt: toIso(log.createdAt)
    }))
  };
}

function awaitableRoleLevelPlaceholder() {
  return 0;
}

async function updateGroupConfig(sock, groupId, sender, input) {
  const permission = await getLivePermission(sock, groupId, sender);
  if (!permission.allowed) throw httpError(403, "sem permissao para alterar esse grupo.");

  const allowedKeys = {
    welcome: "configs.welcome",
    antilink: "configs.antlink",
    brincadeira: "configs.cmdFun",
    autoReply: "autoReply",
    autoDownload: "autoDownload",
    antiTotag: "antiTotag",
    events: "configs.events"
  };

  const set = {};
  if (input?.prefixo !== undefined) {
    const prefixo = String(input.prefixo || "").trim();
    if (!prefixo || prefixo.length > 1) throw httpError(400, "prefixo deve ter 1 caractere.");
    set["configs.prefixo"] = prefixo;
  }

  for (const [key, path] of Object.entries(allowedKeys)) {
    if (input?.[key] !== undefined) set[path] = !!input[key];
  }

  if (!Object.keys(set).length) throw httpError(400, "nenhuma configuracao enviada.");

  const group = await updateGroupAndCache(groupId, {$set: set}, {metadata: permission.metadata});
  const role = permission.role.name;
  await logPanelAction({actorLid: sender, actorRole: role, groupId, action: "config", status: "success", details: set});
  await sendGroupAuditNotice(sock, groupId, sender, "configuracao do grupo", null);

  return compactGroup(group);
}

async function runGroupAction(sock, groupId, sender, input) {
  const permission = await getLivePermission(sock, groupId, sender);
  if (!permission.allowed) throw httpError(403, "sem permissao para agir nesse grupo.");

  const action = String(input?.action || "").trim();
  const target = input?.targetLid ? normalizeUserLid(input.targetLid) : null;
  const targetActions = new Set(["mute", "unmute", "warn", "unwarn", "ban", "promote", "demote"]);
  const validActions = new Set([...targetActions, "open", "close"]);
  if (!validActions.has(action)) throw httpError(400, "acao invalida.");
  if (targetActions.has(action) && !target) throw httpError(400, "alvo obrigatorio.");
  if (target && isBotTarget(target) && ["mute", "ban", "demote"].includes(action)) {
    throw httpError(400, "nao da pra usar essa acao contra a yuki.");
  }
  if (target && !(await canModerateTarget(sender, target))) {
    throw httpError(403, "esse usuario esta acima de voce na hierarquia.");
  }

  const targetParticipant = target ? findParticipant(permission.metadata, target) : null;
  const socketTarget = targetParticipant?.id || targetParticipant?.lid || target;

  const role = permission.role.name;
  try {
    let message = "acao executada.";

    if (action === "mute") {
      const existing = await mutados.findOneAndUpdate(
        {userLid: target, grupo: groupId},
        {$setOnInsert: {userLid: target, grupo: groupId}},
        {upsert: true, new: false}
      );
      setMuteCache(target, groupId, existing?.toObject?.() || {userLid: target, grupo: groupId, tentativasMsg: 0});
      message = existing ? "usuario ja estava mutado." : "usuario mutado.";
    }

    if (action === "unmute") {
      const result = await mutados.deleteOne({userLid: target, grupo: groupId});
      invalidateMute(target, groupId);
      message = result.deletedCount ? "usuario desmutado." : "usuario nao estava mutado.";
    }

    if (action === "warn") {
      const adv = await advertidos.findOneAndUpdate(
        {userLid: target, grupo: groupId},
        {$inc: {adv: 1}},
        {new: true, upsert: true, setDefaultsOnInsert: true}
      );
      message = `advertencia adicionada (${adv.adv}).`;
      if (adv.adv >= 3) {
        await sock.groupParticipantsUpdate(groupId, [socketTarget], "remove");
        await advertidos.deleteOne({userLid: target, grupo: groupId});
        message = "usuario removido por 3 advertencias.";
      }
    }

    if (action === "unwarn") {
      const adv = await advertidos.findOneAndUpdate(
        {userLid: target, grupo: groupId, adv: {$gt: 0}},
        {$inc: {adv: -1}},
        {new: true}
      );
      message = adv ? `advertencia removida (${adv.adv}).` : "usuario nao tinha advertencias.";
    }

    if (action === "ban") {
      await sock.groupParticipantsUpdate(groupId, [socketTarget], "remove");
      message = "usuario removido do grupo.";
    }

    if (action === "promote") {
      await sock.groupParticipantsUpdate(groupId, [socketTarget], "promote");
      message = "usuario promovido a admin.";
    }

    if (action === "demote") {
      await sock.groupParticipantsUpdate(groupId, [socketTarget], "demote");
      message = "usuario rebaixado.";
    }

    if (action === "open") {
      await sock.groupSettingUpdate(groupId, "not_announcement");
      message = "grupo aberto.";
    }

    if (action === "close") {
      await sock.groupSettingUpdate(groupId, "announcement");
      message = "grupo fechado.";
    }

    await logPanelAction({actorLid: sender, actorRole: role, groupId, targetLid: target, action, status: "success", message});
    await sendGroupAuditNotice(sock, groupId, sender, action, target);
    return {ok: true, message};
  } catch (err) {
    await logPanelAction({
      actorLid: sender,
      actorRole: role,
      groupId,
      targetLid: target,
      action,
      status: "failed",
      message: err?.message || String(err)
    });
    throw err;
  }
}

function buildAnnouncementText(text, actorName) {
  return `*Comunicado da Yuki*\n\n${text}\n\n_Enviado por ${actorName || "staff da Yuki"}._`;
}

async function getAnnouncementGroups(limit) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 15, 1), ANNOUNCEMENT_LIMIT);
  const docs = await grupos
    .find({groupId: /@g\.us$/, aluguel: {$gt: new Date()}})
    .select("groupId grupoName configs")
    .sort({grupoName: 1})
    .lean();

  const enabled = docs.filter((group) => group?.configs?.announcements !== false);
  return {
    total: enabled.length,
    selected: enabled.slice(0, cappedLimit)
  };
}

async function createAnnouncementPreview(sender, input) {
  const role = await getRole(sender);
  if (role.level === 0) throw httpError(403, "sem permissao para announcement.");

  const text = String(input?.text || "").trim();
  if (text.length < 5) throw httpError(400, "mensagem muito curta.");
  if (text.length > 2000) throw httpError(400, "mensagem muito longa.");

  const minDelay = Math.max(Number(input?.minDelay) || 20, ANNOUNCEMENT_MIN_DELAY_SECONDS);
  const maxDelay = Math.max(Number(input?.maxDelay) || minDelay, minDelay);
  const {total, selected} = await getAnnouncementGroups(input?.limit);
  if (!selected.length) throw httpError(404, "nenhum grupo ativo encontrado.");

  const actor = await users.findOne({userLid: sender}).select("name").lean();
  const message = buildAnnouncementText(text, actor?.name);
  const id = crypto.randomBytes(8).toString("hex");
  const preview = {
    id,
    sender,
    role: role.name,
    groups: selected,
    total,
    message,
    minDelay,
    maxDelay,
    expiresAt: Date.now() + ANNOUNCEMENT_PREVIEW_TTL_MS
  };

  announcementPreviews.set(id, preview);
  return serializeAnnouncementPreview(preview);
}

function serializeAnnouncementPreview(preview) {
  return {
    id: preview.id,
    groups: preview.groups.map((group) => ({groupId: group.groupId, name: group.grupoName || "Sem nome"})),
    total: preview.total,
    selected: preview.groups.length,
    message: preview.message,
    minDelay: preview.minDelay,
    maxDelay: preview.maxDelay,
    expiresAt: toIso(preview.expiresAt)
  };
}

async function confirmAnnouncement(sock, sender, previewId) {
  if (!sock) throw httpError(503, "socket da yuki indisponivel.");

  const role = await getRole(sender);
  if (role.level === 0) throw httpError(403, "sem permissao para announcement.");
  if (runningAnnouncement) throw httpError(409, "ja existe announcement rodando.");
  if (Date.now() - lastAnnouncementAt < ANNOUNCEMENT_COOLDOWN_MS) {
    throw httpError(429, "cooldown de announcement ativo.");
  }

  const preview = announcementPreviews.get(previewId);
  if (!preview || preview.sender !== sender || preview.expiresAt < Date.now()) {
    announcementPreviews.delete(previewId);
    throw httpError(404, "preview expirado ou invalido.");
  }

  announcementPreviews.delete(previewId);
  runningAnnouncement = preview.id;
  lastAnnouncementAt = Date.now();

  runAnnouncement(sock, preview).catch((err) => {
    console.error("Erro no announcement do painel:", err);
  });

  await logPanelAction({
    actorLid: sender,
    actorRole: role.name,
    action: "announcement",
    status: "success",
    message: `announcement iniciado para ${preview.groups.length} grupos`
  });

  return {ok: true, id: preview.id, groups: preview.groups.length};
}

async function runAnnouncement(sock, preview) {
  try {
    for (const group of preview.groups) {
      await new Promise((resolve) => setTimeout(resolve, preview.minDelay * 1000));
      try {
        await sock.sendMessage(group.groupId, {text: preview.message});
      } catch (err) {
        await logPanelAction({
          actorLid: preview.sender,
          actorRole: preview.role,
          groupId: group.groupId,
          action: "announcement",
          status: "failed",
          message: err?.message || String(err)
        });
      }
    }
  } finally {
    runningAnnouncement = null;
  }
}

module.exports = {
  buildPanelHome,
  confirmAnnouncement,
  createAnnouncementPreview,
  decodeGroupId,
  getGroupPanel,
  runGroupAction,
  updateGroupConfig
};
