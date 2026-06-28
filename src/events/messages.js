const { prefixo, numberBot, numberBotJid } = require("../config.js");
const similarityCmd = require("../utils/similaridadeCmd");
const { users } = require("../database/models/users");
const { donos } = require("../database/models/donos");
const { grupos } = require("../database/models/grupos");
const instaDl = require("../utils/instagram");
const { mutados } = require("../database/models/mute");
const axios = require("axios");
const menu = require("../utils/menu");
const YukiBot = require("../utils/fuc");
const spotifyDl = require("../utils/spotify.js");
const { clientRedis } = require("../lib/redis.js");
const { clientMp, payment} = require("../lib/mercadoPago.js");
const{ yukiEv,
  comprarWaifu, pagamento } = require("../utils/events.js");
const { advertidos } = require("../database/models/adverts.js");
const addXp = require("../utils/xp.js");
const YukiAI = require("../ai.js");
const { normalizeUserLid } = require("../utils/normalizeUserLid");
const { isOwnerLid } = require("../utils/owner");
const { isBotBanned } = require("../utils/botBan");
const { resolveOwnerDuel } = require("../utils/ownerLuck");
const normalizeCommandKey = require("../utils/commandKey");
const { buildCommandCatalog, findRelevantCommandContext } = require("../utils/commandCatalog");
const {
  getPersonalSender,
  isExplicitCommand,
  isPersonalActor,
  isPersonalAiEnabled,
  isPersonalMode
} = require("../utils/personalMode");
const { groupCache, muteCache, ownerCache, userCache } = require("../utils/hotPathCache");
const {
  createMessageMongoMetrics,
  finishMessageMongoMetrics,
  markQueuedWrite,
  trackMongo
} = require("../utils/messageMongoMetrics");
const { queueCommandActivity, queueMessageActivity } = require("../utils/statsBatcher");
const {
  invalidateMute,
  muteCacheKey,
  setMuteCache,
  updateUserAndCache
} = require("../utils/dbHelpers");

const NULL_CACHE_TTL_MS = 5 * 1000;
const OWNER_NEGATIVE_CACHE_TTL_MS = 60 * 1000;
const pendingUserLoads = new Map();
const pendingGroupLoads = new Map();
const pendingOwnerLoads = new Map();

async function oncePerKey(map, key, loader) {
  if (map.has(key)) return map.get(key);

  const promise = loader().finally(() => {
    map.delete(key);
  });

  map.set(key, promise);
  return promise;
}

async function ensureCachedUser(sender, pushName, metrics) {
  const user = await oncePerKey(pendingUserLoads, `ensure:${sender}`, () =>
    trackMongo(metrics, "users.findOneAndUpdate:ensure", () =>
      users.findOneAndUpdate(
        { userLid: sender },
        { $setOnInsert: { userLid: sender, name: pushName || "Sem nome" } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean()
    )
  );

  userCache.set(sender, user || null);
  return user;
}

async function getCachedGroup(groupId, metrics) {
  const cached = groupCache.get(groupId);
  if (cached !== undefined) return cached;

  const group = await oncePerKey(pendingGroupLoads, `get:${groupId}`, () =>
    metrics
      ? trackMongo(metrics, "grupos.findOne:group", () =>
        grupos.findOne({ groupId }).lean()
      )
      : grupos.findOne({ groupId }).lean()
  );

  groupCache.set(groupId, group || null, group ? undefined : NULL_CACHE_TTL_MS);
  return group;
}

async function ensureCachedGroup(sock, groupId, metrics) {
  const group = await oncePerKey(pendingGroupLoads, `ensure:${groupId}`, async () => {
    const groupDados = await sock.groupMetadata(groupId);

    return trackMongo(metrics, "grupos.findOneAndUpdate:ensure", () =>
      grupos.findOneAndUpdate(
        { groupId },
        {
          $setOnInsert: {
            groupId,
            grupoName: groupDados.subject || "Sem nome",
            ownerId: groupDados?.owner || "Sem dono"
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean()
    );
  });

  groupCache.set(groupId, group || null);
  return group;
}

async function getCachedOwner(sender, metrics) {
  const cached = ownerCache.get(sender);
  if (cached !== undefined) return cached;

  const owner = await oncePerKey(pendingOwnerLoads, sender, () =>
    trackMongo(metrics, "donos.findOne:sender", () =>
      donos.findOne({ userLid: sender }).lean()
    )
  );

  const isOwner = !!owner;
  ownerCache.set(sender, isOwner, isOwner ? undefined : OWNER_NEGATIVE_CACHE_TTL_MS);
  return isOwner;
}

async function safeRedis(action, fallback = null) {
  if (!clientRedis?.isOpen) return fallback;

  try {
    return await action();
  } catch (err) {
    console.error("Erro no Redis:", err);
    return fallback;
  }
}

    //Parte que lida com mensagens em lotes
    //fila de mensagens de cada grupo
    let messageQueue = new Map();
    //flag pra evitar que seja rodado 2 msg ao mesmo tempo por grupo
    let flagMessage = new Map();
    
    //Mapa de intervslos
    const activeInterval = new Map();
    const aiGroupState = new Map();

    const yukiIA = new YukiAI(process.env.AI_KEY);
    
    
    
    //parte que lida com cada mensagem
    async function processMessage(groupId) {
      //caso já estiver true um processamento
      if(flagMessage.get(groupId)) return;
      //se nao ativa o true e continua
      flagMessage.set(groupId, true);
      
      const queue = messageQueue.get(groupId);
      if(!queue) {
        flagMessage.set(groupId, false);
        return;
      }

      try {
      
      //enquanto messageQueue for maior que zero
      while(queue.length > 0) {
        
        //Decide um delay aleatorio entre 1 e 2
      const delayRandom = Math.max(1000, Math.floor(Math.random() * 2000));
        
        //pega a primeira mensagem
        const messageFuc = queue.shift();
        
        try {
          //e executa
          await messageFuc();
        }
        catch(err) {
          // se der erro printa
          console.error("Erro ao processar mensagem", err);
        }
              //cria uma nova promise
      await new Promise(resolve => setTimeout(resolve, delayRandom * 2));
      }
      
      }
      catch(err) {
        console.error(err)
      }
      finally {
      //Depois dos 2 segundos ele seta pra false
      flagMessage.set(groupId, false);
      }
    }
    
    //map de usos de comando
    const cooldown = new Map();
    
     //Lida com spams de mesmos comandos
    
    
    function spamCommand(user, command) {
      const LIMITE = 5;
      const TEMPO = 60 * 1000;
      const agora = Date.now();
      const key = `${user}:${command}`
      
      //Se nao existe cria
      if(!cooldown.has(key)) {
        cooldown.set(key, []);
      }
      
      //pega os usos 
      const usos = cooldown.get(key);
      
      //filtra por recentes
      const usosRecentes = usos.filter(tempo => agora - tempo < TEMPO);
      
      //adiciona o TEMPO
      usosRecentes.push(agora);
      //adiciona e volta pro Map
      cooldown.set(key, usosRecentes);
      
      //Retorna se usos recente for maior ou igual ao limite
      return usosRecentes.length >= LIMITE
      
    }

    const AI_HISTORY_LIMIT = 8;
    const AI_OWNER_PATTERNS = [
      /\bspeed\b/,
      /\bjoao\b/,
      /\blenoz\b/,
      /\bluis\b/,
      /\bluisf\b/,
      /\bjoao guilherme\b/,
      /\blenoz7\b/
    ];
    const AI_YUKI_PATTERNS = [
      /\byuki\b/,
      /\byuke\b/
    ];
    const AI_CONTEXT_PATTERNS = [
      /\?/,
      /\b(opina|acha|concorda|discorda|melhor|pior|qual|quem|sera|sera que|pq|por que|faz sentido|nao sei|deveria|vale a pena)\b/
    ];
    const AI_DIRECT_GROUP_COOLDOWN_MS = 12 * 1000;
    const AI_DIRECT_SENDER_COOLDOWN_MS = 6 * 1000;

    function stripAccents(value) {
      return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }

    function normalizeAiText(value) {
      return stripAccents(value)
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    function shortText(value, limit = 180) {
      const text = String(value ?? "").replace(/\s+/g, " ").trim();
      if (!text) return "";
      return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
    }

    function randomBetween(min, max) {
      return min + Math.floor(Math.random() * (max - min + 1));
    }

    function isReplyingToBot(ctx) {
      const quotedParticipant = ctx?.participant;
      const quotedRemoteJid = ctx?.remoteJid;

      const normalizedQuotedParticipant = normalizeUserLid(quotedParticipant);
      const normalizedQuotedRemoteJid = normalizeUserLid(quotedRemoteJid);
      const normalizedBotLid = normalizeUserLid(numberBot);
      const normalizedBotJid = normalizeUserLid(numberBotJid);

      return [
        normalizedQuotedParticipant,
        normalizedQuotedRemoteJid
      ].some((candidate) => candidate && [normalizedBotLid, normalizedBotJid].includes(candidate));
    }

    function isStrongAiTrigger(kind) {
      return ["owner", "reply", "yuki"].includes(kind);
    }

    function getAiState(groupId) {
      if (!aiGroupState.has(groupId)) {
        aiGroupState.set(groupId, {
          recent: [],
          lastSeenAt: 0,
          lastReplyAt: 0,
          lastAmbientAt: 0,
          lastActivityCount: 0,
          lastSenderReplyAt: new Map()
        });
      }

      return aiGroupState.get(groupId);
    }

    function getActivityProfile(activityCount = 0) {
      if (activityCount >= 20) {
        return {
          level: "rush",
          chanceScale: 0.3,
          cooldownMs: 40 * 60 * 1000,
          senderCooldownMs: 12 * 60 * 1000,
          silenceMinMs: 35 * 60 * 1000,
          silenceMaxMs: 55 * 60 * 1000,
          ambientChance: 0.03
        };
      }

      if (activityCount >= 10) {
        return {
          level: "busy",
          chanceScale: 0.55,
          cooldownMs: 22 * 60 * 1000,
          senderCooldownMs: 9 * 60 * 1000,
          silenceMinMs: 20 * 60 * 1000,
          silenceMaxMs: 32 * 60 * 1000,
          ambientChance: 0.06
        };
      }

      if (activityCount >= 4) {
        return {
          level: "normal",
          chanceScale: 0.9,
          cooldownMs: 14 * 60 * 1000,
          senderCooldownMs: 6 * 60 * 1000,
          silenceMinMs: 12 * 60 * 1000,
          silenceMaxMs: 20 * 60 * 1000,
          ambientChance: 0.11
        };
      }

      return {
        level: "calm",
        chanceScale: 1.2,
        cooldownMs: 8 * 60 * 1000,
        senderCooldownMs: 4 * 60 * 1000,
        silenceMinMs: 8 * 60 * 1000,
        silenceMaxMs: 14 * 60 * 1000,
        ambientChance: 0.18
      };
    }

    function shouldTrackAiContext(body, groupPrefix) {
      const normalizedBody = normalizeAiText(body);
      const normalizedPrefix = normalizeAiText(groupPrefix || prefixo);

      if (!normalizedBody) return false;
      if (normalizedPrefix && normalizedBody.startsWith(normalizedPrefix)) return false;
      if (normalizedBody.startsWith(">")) return false;
      if (normalizedBody.startsWith("/")) return false;
      if (/^(https?:\/\/|www\.)/.test(normalizedBody)) return false;

      return true;
    }

    function detectAiTrigger(body, ctx) {
      const normalizedBody = normalizeAiText(body);

      if (isReplyingToBot(ctx)) {
        return {
          kind: "reply",
          baseChance: 0.92
        };
      }

      if (!normalizedBody) {
        return {
          kind: "none",
          baseChance: 0
        };
      }

      if (AI_OWNER_PATTERNS.some((pattern) => pattern.test(normalizedBody))) {
        return {
          kind: "owner",
          baseChance: 0.85
        };
      }

      if (AI_YUKI_PATTERNS.some((pattern) => pattern.test(normalizedBody))) {
        return {
          kind: "yuki",
          baseChance: 0.7
        };
      }

      if (AI_CONTEXT_PATTERNS.some((pattern) => pattern.test(normalizedBody))) {
        return {
          kind: "context",
          baseChance: 0.35
        };
      }

      if (normalizedBody.length >= 90) {
        return {
          kind: "ambient",
          baseChance: 0.08
        };
      }

      return {
        kind: "ambient",
        baseChance: 0.04
      };
    }

    function registerAiMessage({ groupId, sender, name, body, activityCount, trackContext }) {
      const state = getAiState(groupId);

      state.lastSeenAt = Date.now();
      state.lastActivityCount = activityCount;

      if (trackContext) {
        state.recent.push({
          sender,
          name: shortText(name || "sem nome", 60) || "sem nome",
          body: shortText(body, 220)
        });

        if (state.recent.length > AI_HISTORY_LIMIT) {
          state.recent.splice(0, state.recent.length - AI_HISTORY_LIMIT);
        }
      }

      if (state.lastSenderReplyAt.size > 25) {
        const now = Date.now();
        for (const [key, timestamp] of state.lastSenderReplyAt.entries()) {
          if (now - timestamp > 60 * 60 * 1000) {
            state.lastSenderReplyAt.delete(key);
          }
        }
      }

      return state;
    }

    function buildRecentContext(state) {
      return (state?.recent || [])
        .slice(-6)
        .map((item) => `${item.name}: ${item.body}`)
        .filter(Boolean);
    }

    async function scheduleSilentReply({ sock, from }) {
      if (isPersonalMode()) return;

      if (activeInterval.has(from)) {
        clearTimeout(activeInterval.get(from));
      }

      const state = getAiState(from);
      const profile = getActivityProfile(state.lastActivityCount || 0);
      const delay = randomBetween(profile.silenceMinMs, profile.silenceMaxMs);
      const scheduledAt = Date.now();

      const timer = setTimeout(async () => {
        activeInterval.delete(from);

        try {
          const freshGroup = await getCachedGroup(from);
          if (!freshGroup?.autoReply) return;

          const currentState = getAiState(from);
          if (!currentState?.recent?.length) return;
          if (currentState.lastSeenAt > scheduledAt) return;

          const currentProfile = getActivityProfile(currentState.lastActivityCount || 0);
          const gap = Date.now() - (currentState.lastReplyAt || 0);
          if (gap < currentProfile.cooldownMs) return;
          if (Math.random() > currentProfile.ambientChance) return;

          const response = await yukiIA.falar({
            text: "A conversa ficou em silencio. Comente de forma curta e natural sobre o assunto recente do grupo.",
            chat: from,
            user: currentState.recent.at(-1)?.name || "grupo",
            context: currentState.recent,
            mode: "ambient",
            commandContext: relevantCommandContext("", currentState.recent)
          });

          if (!response) return;

          await sock.sendMessage(from, { text: response });
          currentState.lastReplyAt = Date.now();
          currentState.lastAmbientAt = currentState.lastReplyAt;
        } catch (err) {
          console.error("Erro ao falar sozinha:", err);
        }
      }, delay);

      activeInterval.set(from, timer);
    }

    async function imageGenerate(sock, msg, body, from) {
      try {
        const startTime = Date.now();
        const message_loading = await sock.sendMessage(from, {text: "A Yuki está pensando..."}, {quoted: msg});

        await sock.sendPresenceUpdate("composing", from);

        const ai_gen = await yukiIA.imagine(body);

        if(ai_gen.error) {
          await sock.sendMessage(from, {text: ai_gen.error}, {quoted: msg});
          return
        }

        const endTime = Date.now();

        await sock.sendMessage(from, {image: {url: ai_gen}}, {quoted: msg});

        const timeImagine = ((endTime - startTime) / 1000).toFixed(1).replace(".", ",");
        await sock.sendMessage(from, {text: `A Yuki pensou em *${timeImagine} segundos.*`, edit: message_loading.key});


        
      } catch (error) {
        console.error(err);
        await sendMessage(from, {text: "falha ao gerar imagem..."}, {quoted: msg});
      }
      finally {
          await sock.sendPresenceUpdate("paused", from)
        }
    }

    async function maybeHandleAiReply({ sock, msg, from, sender, body, groupReply, forcePersonal = false }) {
      const personalMode = isPersonalMode();
      const regularGroupAi = groupReply?.autoReply && from.endsWith("@g.us");
      if (personalMode && !forcePersonal) return false;
      if (!personalMode && !regularGroupAi) return false;

      const groupPrefix = groupReply?.configs?.prefixo || prefixo;
      const trackContext = shouldTrackAiContext(body, groupPrefix);
      const activityRaw = Number(await safeRedis(() => clientRedis.get(`message:min:${from}`), 0)) || 0;
      const state = registerAiMessage({
        groupId: from,
        sender,
        name: msg?.pushName || "sem nome",
        body,
        activityCount: activityRaw,
        trackContext
      });

      await scheduleSilentReply({ sock, from });

      if (!trackContext) return false;

      const ctx = msg.message?.extendedTextMessage?.contextInfo;

      const image_gen_detect_list = ["gerar", "gere", "desenhe", "desenhar", "imagine", "imagina", "faça"];
      const image_gen_detect = new RegExp(`\\b(${image_gen_detect_list.join("|")})\\b`, "i");

      if(image_gen_detect.test(body)) {
        imageGenerate(sock, msg, body, from);
        return;
      }

      const trigger = detectAiTrigger(body, ctx);
      if (trigger.kind === "none") return false;

      const profile = getActivityProfile(activityRaw);
      const now = Date.now();
      const groupGap = now - (state.lastReplyAt || 0);
      const senderGap = now - (state.lastSenderReplyAt.get(sender) || 0);
      const strongTrigger = isStrongAiTrigger(trigger.kind);
      const minGroupGap = strongTrigger ? AI_DIRECT_GROUP_COOLDOWN_MS : profile.cooldownMs;
      const minSenderGap = strongTrigger ? AI_DIRECT_SENDER_COOLDOWN_MS : profile.senderCooldownMs;

      if (groupGap < minGroupGap) return false;
      if (senderGap < minSenderGap) return false;

      const chance = strongTrigger ? 1 : Math.min(0.96, trigger.baseChance * profile.chanceScale);
      if (Math.random() > chance) return false;

      try {
        await sock.sendPresenceUpdate("composing", from);

        const response = await yukiIA.falar({
          text: body,
          chat: from,
          user: msg?.pushName || "sem nome",
          context: state.recent,
          mode: trigger.kind === "reply" ? "reply" : trigger.kind === "owner" ? "owner" : "context",
          commandContext: relevantCommandContext(body, state.recent)
        });

        if (!response) {
          await sock.sendPresenceUpdate("paused", from);
          return false;
        }

        await sock.sendMessage(from, { text: response }, { quoted: msg });
        await yukiIA.memoria(body, response, { user: msg?.pushName || "sem nome", chat: from });
        await sock.sendPresenceUpdate("paused", from);

        state.lastReplyAt = now;
        state.lastSenderReplyAt.set(sender, now);
        return true;
      } catch (err) {
        console.error("Erro na auto resposta da Yuki:", err);
        try {
          await sock.sendPresenceUpdate("paused", from);
        } catch {}
        if (err?.status === 429) {
          await sock.sendMessage(from, { text: "Limite de requisição atingido, espere alguns instantes." }, { quoted: msg });
        }
        return false;
      }
    }

module.exports = (sock, commandsMap, erros_prontos, espera_pronta) => {
  yukiIA.setCommandCatalog(buildCommandCatalog(commandsMap));

  function getMessageBody(msg) {
    return (msg?.message?.conversation) ||
      (msg?.message?.extendedTextMessage?.text) ||
      (msg?.message?.imageMessage?.caption) ||
      (msg?.message?.documentMessage?.caption) ||
      msg?.message?.buttonsResponseMessage?.selectedButtonId ||
      "";
  }

  function relevantCommandContext(body, recent = []) {
    return findRelevantCommandContext(commandsMap, [
      body,
      ...(recent || []).map((item) => item.body || item)
    ]);
  }

  sock.ev.on("messages.upsert", async (m) => {
    const personalMode = isPersonalMode();
    const messages = Array.isArray(m?.messages) ? m.messages : [];
    const msg = personalMode
      ? messages.find((candidate) => isExplicitCommand(getMessageBody(candidate), prefixo)) ||
        messages.find((candidate) => candidate?.key?.fromMe) ||
        messages[0]
      : messages[0];
    if (!msg?.key) return;
    if (msg.key.fromMe && !personalMode) return;
    const personalSender = personalMode ? getPersonalSender(sock) : null;
    
    const senderRaw =
      (personalMode && msg.key.fromMe ? personalSender : null) ||
      msg?.key?.participantLid ||
      msg?.key?.senderLid ||
      msg?.key?.participant ||
      msg?.key?.remoteJid;

    const sender = normalizeUserLid(senderRaw);
    
    const from = msg?.key?.remoteJid || msg?.key?.participantLid
    if (!from || !sender) return;

    const bot = new YukiBot({sock: sock, msg});
    const body = getMessageBody(msg) || "Msg estranha...";
    const bodyCase = body.toLowerCase();

    //argumentos
    const args = body.slice(prefixo.length).trim().split(/ +/);
    const isPrefixCommand = body.startsWith(prefixo);
    const isExplicitPersonalCommand = isExplicitCommand(body, prefixo);
    const noPrefixPreview = isPrefixCommand ? [] : body.trim().split(/ +/);
    const noPrefixCommandName = normalizeCommandKey(noPrefixPreview[0]);
    const noPrefixCommandCandidate = noPrefixCommandName ? commandsMap.get(noPrefixCommandName) : null;
    const personalActor = personalMode ? isPersonalActor({ msg, sender, sock }) : false;

    if (personalMode) {
      if (!personalActor) return;

      if (!isExplicitPersonalCommand) {
        if (await isPersonalAiEnabled(from)) {
          await maybeHandleAiReply({
            sock,
            msg,
            from,
            sender,
            body,
            groupReply: { autoReply: true, configs: { prefixo } },
            forcePersonal: true
          });
        }
        return;
      }

      if (isPrefixCommand) {
        const personalArgs = body.slice(prefixo.length).trim().split(/ +/);
        const personalCommandName = normalizeCommandKey(personalArgs.shift());
        const personalCommand = commandsMap.get(personalCommandName);

        console.log(`[personal-mode] comando direto: /${personalCommandName || ""} existe=${!!personalCommand}`);

        if (!personalCommand) {
          await sock.sendMessage(from, { text: `Comando nao encontrado: ${prefixo}${personalCommandName || ""}` });
          return;
        }

        try {
          await personalCommand.execute(sock, msg, from, personalArgs, erros_prontos, espera_pronta, bot, sender);
          console.log(`[personal-mode] /${personalCommandName} finalizado`);
        } catch (err) {
          console.error(`[personal-mode] erro em /${personalCommandName}:`, err);
          await sock.sendMessage(from, { text: erros_prontos });
        }
        return;
      }
    }

    const mongoMetrics = createMessageMongoMetrics({ from, sender });

    try {
    if (await isBotBanned(sender)) return;
    
    
    
    if(!personalMode && process.env.DEV_AMBIENT === "true" && from !== '120363424415515445@g.us') return;
    //console.log(msg)
//escopo pra Nao vazar variaveis
     {
    //pega o ms da msg
    const msgTime = Number(msg.messageTimestamp || 0) * 1000
    //pega o ms atual
    const agora = Date.now();
    
    const msgTemp = agora - msgTime
    //se for mensagem de 10 seg ingnora
    if(msgTemp >= 20000) return;
    }
    
        //lê todas mensagens
    try {
      await sock.readMessages([msg.key]);
    }
    catch(err) {
      console.error("Erro ao marcar mensagem como lida", err);
    }
    //ignora mensagens de si mesmo
    if(process.env.DEV_AMBIENT === "false") {
    if (msg.key.fromMe && !personalMode) return
      
    }
    
//console.log(msg);
    
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    
   const mentions =
  msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || ctx?.participant || [];
  
  

    

    const isGroup = from.endsWith("@g.us");
    const isPrivate = from.endsWith("@lid");
    let ownerPromise = null;

    const getOwner = () => {
      if (!ownerPromise) ownerPromise = getCachedOwner(sender, mongoMetrics);
      return ownerPromise;
    };

    let usersSender = null;
    let userLoaded = false;

    async function getUsersSender() {
      if (userLoaded) return usersSender;

      const cachedUser = userCache.get(sender);
      if(cachedUser) {
        usersSender = cachedUser;
      } else {
        usersSender = await ensureCachedUser(sender, msg.pushName, mongoMetrics);
      }

      userLoaded = true;
      return usersSender;
    }
    
    await safeRedis(() => clientRedis.incr("metrics:message:min"));
    await safeRedis(() => clientRedis.expire("metrics:message:min", 60));
    
    await safeRedis(() => clientRedis.incr(`message:min:${from}`));
    await safeRedis(() => clientRedis.expire(`message:min:${from}`, 60))
    
    

    //Se uma mensagem Nao vier de um grupo entao ele pausa os comandos
    if(!personalMode && isPrivate) {
      const privateUser = await getUsersSender();
      const Notvip = !privateUser?.vencimentoVip || Date.now() > privateUser?.vencimentoVip?.getTime();

      if(!(await getOwner()) && Notvip) {
      
      const IsMsgPV = await safeRedis(() => clientRedis.exists(`pv:block:${sender}`), 0);
      
      if(IsMsgPV === 1) return;
      
      await bot.reply(from, `Olá ${msg.pushName}, me adicione a um grupo para ver meu menu, caso deseja ter acesso liberado a Yuki use *${prefixo}alugar*, obrigada!`);
      
      await safeRedis(() => clientRedis.set(`pv:block:${sender}`, "1"));
      
      await safeRedis(() => clientRedis.expire(`pv:block:${sender}`, 2 * 60));
      
      return;
      }
    }
    let groupDBInfo = null;

    //se uma mensagem for de um grupo registra.
    if(isGroup) {

      groupDBInfo = await getCachedGroup(from, mongoMetrics)
      //verifica se é adm
      if(isPrefixCommand || noPrefixCommandCandidate) {
      const commandUser = await getUsersSender();
      const isAdmRegistrado = commandUser?.grupos?.some(grupo => grupo.id === from);

      if(!isAdmRegistrado) {
        const isAdminSender = await bot.isAdmin(from);
        
        if(isAdminSender) {
          try {
            const groupDados = await sock.groupMetadata(from);

            const updatedUser = await trackMongo(mongoMetrics, "users.findOneAndUpdate:adminGroup", () =>
              updateUserAndCache(
                sender,
                {$addToSet: {grupos: {id: from, nome: groupDados.subject}}},
                {upsert: true, name: msg.pushName || "Sem nome"}
              )
            );

            usersSender = updatedUser?.toObject?.() || updatedUser || commandUser;
            userLoaded = true;
          } catch(err) {
            console.error("Erro ao salvar grupo do admin:", err?.data || err?.message || err);
          }
        }
      }
      }
      
      if(!groupDBInfo) {
        
        try {
          groupDBInfo = await ensureCachedGroup(sock, from, mongoMetrics);
        } catch(err) {
          console.error("Erro ao registrar grupo:", err?.data || err?.message || err);
        }
    }
      
    }
    
    if (!personalMode) {
      queueMessageActivity(sender, from);
      markQueuedWrite(mongoMetrics);
    }

     //se estiver alguem mutado
    let userMutado = null;
    if(!personalMode && isGroup) {
      const cachedMute = muteCache.get(muteCacheKey(sender, from));
      if(cachedMute !== undefined) {
        userMutado = cachedMute;
      } else {
        userMutado = await trackMongo(mongoMetrics, "mutados.findOne:message", () =>
          mutados.findOne({userLid: sender, grupo: from}).lean()
        );
        muteCache.set(
          muteCacheKey(sender, from),
          userMutado || null,
          userMutado ? undefined : Number(process.env.MUTE_NEGATIVE_CACHE_TTL_MS || 30 * 1000)
        );
      }
    }

    if(userMutado) {
      try {
      //apaga todas as msg
      await sock.sendMessage(userMutado.grupo, {delete: msg.key})
      
      const muteTentativa = await trackMongo(mongoMetrics, "mutados.findOneAndUpdate:tentativas", () =>
        mutados.findOneAndUpdate({userLid: sender, grupo: from}, {$inc: {tentativasMsg: 1}}, {new: true}).lean()
      );
      //se a pessoa for desmutada antes
      if(!muteTentativa) {
        invalidateMute(sender, from);
        return;
      }
      setMuteCache(sender, from, muteTentativa);
      //se ela tentar mandar mais de 3 mensagens
      if(muteTentativa.tentativasMsg >= 3) {
        //remove ela do grupo
        await sock.groupParticipantsUpdate(muteTentativa.grupo, [muteTentativa.userLid], 'remove');
        //apaga ela da colessao
        await trackMongo(mongoMetrics, "mutados.deleteOne:limite", () =>
          mutados.deleteOne({userLid: sender, grupo: from})
        );
        invalidateMute(sender, from);
        
      }
      
      }
      
      catch(err) {
        console.error(err);
      }
      return
    }
    
    if (!personalMode) {
      addXp(sender, 1, sock, from, msg);
      markQueuedWrite(mongoMetrics);
    }

    if (!personalMode) {
    //Caso tenha um aluguel a pagar
    const alugarExiste = await safeRedis(() => clientRedis.exists(`aluguel:${sender}&${from}`), 0);
    
    const aluguelObj = await safeRedis(() => clientRedis.hGetAll(`aluguel:${sender}&${from}`), {});
    
    if(alugarExiste) {
      
      
      if(bodyCase === "confirmar") {
        try {
        await bot.reply(from, "Gerando copia e cola...");
        
        const paymentAluguel = await payment.create({
      body: {
      transaction_amount: Number(aluguelObj.valor),
  description: "Aluguel da Yuki!",
  payment_method_id: "pix",
  payer: {
    email: "yuki@gmail.com"
  }}
});
        const dataPix = paymentAluguel;
        
        await safeRedis(() => clientRedis.hSet(`payment:${dataPix.id}`, {user: sender, groupId: from, dias: aluguelObj.dias, valor: aluguelObj.valor}));
        
        const qrCodeAluguel = dataPix.point_of_interaction.transaction_data;
        
        const infoAluguelPay = `⤷ *Id:* ${dataPix.id}\n⤷ *Status:* ${dataPix.status}\n⤷ *Valor:* ${aluguelObj.valor}`;
        
        const qrBase64 = qrCodeAluguel.qr_code_base64.replace(/^data:image\/png;base64,/, "");
        const qrBuffer = Buffer.from(qrBase64, "base64");
        
        await sock.sendMessage(from, {image: qrBuffer, caption: infoAluguelPay}, {quoted: msg});
        
        await bot.reply(from, `*Aqui está seu copia e cola:*\n⤷ ${qrCodeAluguel.qr_code}`);
        
        //await bot.reply(from, "Qr code e pix copia e cola enviado! Olhe seu privado.");
        
        await bot.reply(from, "Esse pagamento vai se expirar em 10 minutos! Ao efetuar pagamento envie uma mensagem pro grupo que alugou e espere 5 segundos.");
        
        }
        catch(err) {
          await bot.send(sender, "Erro encontrado fale com meu dono imediatamente!!\n\n⤷ https://api.whatsapp.com/send/?phone=%2B558791732587&text=Oi,%20Speed&type=phone_number&app_absent=0&wame_ctl=1");
          console.error(err);
          await safeRedis(() => clientRedis.del(`aluguel:${sender}&${from}`));
        }
        
        
      }
      
      else if(bodyCase === "cancelar") {
        
        await safeRedis(() => clientRedis.del(`aluguel:${sender}&${from}`));
        
        await bot.reply(from, "Poxa... Que pena, qualquer coisa já sabe! Usa */alugar*");
        
      }
      
    }
        
        
        
        //caso tenha uma aposta 
    const apostaPendente = await safeRedis(() => clientRedis.exists(`aposta:${sender}`), 0);
    if(apostaPendente) {
      
      const apostaObject = await safeRedis(() => clientRedis.hGetAll(`aposta:${sender}`), {});
      
      if(bodyCase.includes("aceitar")) {
        try {
          const valorAposta = Number(apostaObject.valor) || 0;

          const msgEspera = await sock.sendMessage(from, {text: "Apostando cara ou coroa... Vamos ver quem vai ganhar"}, {quoted: msg});

          const ownerDuel = await resolveOwnerDuel(apostaObject.autor, apostaObject.alvo);
          const alvoLid = normalizeUserLid(apostaObject.alvo);
          const caraOuCora = ownerDuel.type === "win"
            ? (ownerDuel.winner === alvoLid ? 0 : 100)
            : Math.floor(Math.random() * 100);

          if (ownerDuel.type === "draw") {
            await sock.sendMessage(from, {
              text: `Empate tecnico. Lenoz contra Speed nao tem perdedor nessa casa.`,
              mentions: [apostaObject.autor, apostaObject.alvo],
              edit: msgEspera.key
            });
            await safeRedis(() => clientRedis.del(`aposta:${sender}`));
            return;
          }

          if(caraOuCora < 50) {
            await sock.sendMessage(from, {text: `Coroa! @${apostaObject.alvo.split("@")[0]} ganhou +${valorAposta}`, mentions: [apostaObject.alvo], edit: msgEspera.key});
            //dá o dinheiro
            await Promise.all([
              trackMongo(mongoMetrics, "users.findOneAndUpdate:apostaWinner", () =>
                updateUserAndCache(apostaObject.alvo, {$inc: {dinheiro: valorAposta}}, {upsert: true})
              ),
              trackMongo(mongoMetrics, "users.findOneAndUpdate:apostaLoser", () =>
                updateUserAndCache(apostaObject.autor, {$inc: {dinheiro: -valorAposta}}, {upsert: true})
              )
            ]);
            
            //apaga
            await safeRedis(() => clientRedis.del(`aposta:${sender}`));
          }
          else {
            await sock.sendMessage(from, {text: `Cara! @${apostaObject.autor.split("@")[0]} ganhou +${valorAposta}`, mentions: [apostaObject.autor], edit: msgEspera.key});
            //dá o valor
            await Promise.all([
              trackMongo(mongoMetrics, "users.findOneAndUpdate:apostaWinner", () =>
                updateUserAndCache(apostaObject.autor, {$inc: {dinheiro: valorAposta}}, {upsert: true})
              ),
              trackMongo(mongoMetrics, "users.findOneAndUpdate:apostaLoser", () =>
                updateUserAndCache(apostaObject.alvo, {$inc: {dinheiro: -valorAposta}}, {upsert: true})
              )
            ]);
            
            await safeRedis(() => clientRedis.del(`aposta:${sender}`));
          }
        }
        catch(err) {
          await bot.reply(from, erros_prontos);
          console.error(err);
        }
        
      }
      if(bodyCase.includes("recusar")) {
        await sock.sendMessage(from, {text: `Aposta de: @${apostaObject.autor.split("@")[0]} recusada!`, mentions: [apostaObject.autor]}, {quoted: msg});
      }
      
      await safeRedis(() => clientRedis.del(`aposta:${sender}`))
      return
    }
    
      //Caso tenha um user com pedido pendente
  const namoroPendente = await safeRedis(() => clientRedis.exists(`namoro:${sender}`), 0);
  if(namoroPendente) {
    
    const namoroObject = await safeRedis(() => clientRedis.hGetAll(`namoro:${sender}`), {});
    
    if(bodyCase === "aceitar") {
      //Adiciona ao pedidor
      await Promise.all([
        trackMongo(mongoMetrics, "users.findOneAndUpdate:namoroAutor", () =>
          updateUserAndCache(namoroObject?.autor, {$set: {"casal.parceiro": namoroObject.alvo, "casal.pedido": new Date()}}, {upsert: true})
        ),
        trackMongo(mongoMetrics, "users.findOneAndUpdate:namoroAlvo", () =>
          updateUserAndCache(sender, {$set: {"casal.parceiro": namoroObject.autor, "casal.pedido": new Date()}}, {upsert: true})
        )
      ]);
      
      //deleta o pedido dos pendentes 
      await safeRedis(() => clientRedis.del(`namoro:${sender}`));
      
      await sock.sendMessage(from, {text: `💕 Um novo amor começa entre @${namoroObject?.autor.split("@")[0]} e @${namoroObject?.alvo.split("@")[0]}💕`, mentions: [sender, namoroObject?.autor]}, {quoted: msg});
    }
    
    else if(bodyCase === "recusar") {
      
      await sock.sendMessage(from, {text: `Sinto muito @${namoroObject.autor.split("@")[0]} 😔 mas @${sender.split("@")[0]} recusou seu pedido💔`, mentions: [sender, namoroObject?.autor]}, {quoted: msg});
      
      //deleta dos pedidos
      await safeRedis(() => clientRedis.del(`namoro:${sender}`));
    }
  }
    }

    
  
  //pega os dados do grupo
  const groupReply = groupDBInfo;
  
  //Caso o grupo tenha a anttotag ativa
  if(!personalMode && from.endsWith("@g.us") && groupReply?.antiTotag) {
    if(msg.key.fromMe) return;
    try {
      //pega info do grupo
      const metadata = await sock.groupMetadata(from);
      //Pega todos os ids do grupo
      const todos = metadata.participants.map(p => p.id);
      
      //Verifica se a quantidade de mencoes é maior ou igual a quantidade de membros
      if((Array.isArray(mentions) ? mentions : []).length >= todos.length) {
        await bot.reply(from, "Ei!!! Detectei uso abusivo de menções. Adeus!");
        
        await sock.groupParticipantsUpdate(from, [sender], 'remove');
        
      }
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
  
  //Caso tenha o antilink ativo
  if(!personalMode && groupReply?.configs?.antlink && (bodyCase.includes("https://") || bodyCase.includes("http://"))) {
    try {
      
      const metadata = await sock.groupMetadata(from);
    const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
    
    if(admins.includes(sender) || msg.key.fromMe) return;
    
    await sock.sendMessage(from, {delete: msg.key});
    
    let advs = await trackMongo(mongoMetrics, "advertidos.findOneAndUpdate:antlink", () =>
      advertidos.findOneAndUpdate(
        {grupo: from, userLid: sender},
        {$inc: {adv: 1}},
        {upsert: true, new: true}
      ).lean()
    );
    
    if(advs.adv >= 3) {
      await bot.reply(from, "Você teve 3 chances.");
      try {
      await sock.groupParticipantsUpdate(from, [sender], "remove");
      
      await advertidos.deleteOne({grupo: from, userLid: sender})
      }
      catch(err) {
        await bot.reply(from, "Talvez eu não tenha admin...");
        
        console.log(err);
      }
      return
    }
    
    await bot.reply(from, `Link detectado!!! Cuidado agora possui ${advs.adv} advertências. Se chegar em 3 será banido!`);
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    return
    
  }
  //caso o grupo tenha autoreply ativo
  if(!personalMode && groupReply?.autoReply && from.endsWith("@g.us")) {

    //geração de texto
    await maybeHandleAiReply({ sock, msg, from, sender, body, groupReply });
  }

  
      //Caso um grupo tenha auto download
  const groupDonwload = groupDBInfo;
  
  if(!personalMode && ((groupDonwload && groupDonwload.autoDownload) || from.endsWith("@lid"))) {
  if(body.includes("https://open.spotify.com/track/")) {
    spotifyDl(sock, msg, from, body, erros_prontos, espera_pronta, bot)
  }
  
  if(body.startsWith("https://www.instagram.com/reel")) {
    
    const buttonInsta = [
      {buttonId: `${prefixo}reels ${body}`, buttonText: {displayText: "𝐁𝐚𝐢𝐱𝐚𝐫 𝐯𝐢𝐝𝐞𝐨⚡️"}, type: 1}
      ];
      
      await sock.sendMessage(from, {text: "Link do instagram detectado! Deseja baixar?", buttons: buttonInsta}, {quoted: msg});
    
    
  }
  
  }
    
    //caso nao tenha mensagens
    if(!msg) return;
    
    const grupoRemote = msg.key.remoteJid
    
              //Se o grupo nao foi iniciado
      if(!messageQueue.has(grupoRemote)) {
        //Cria a lista de cada grupo
        messageQueue.set(grupoRemote, []);
        //marca como false
        flagMessage.set(grupoRemote, false);
      }

    //Caso o users tenha o modo sem prefixo
if(!personalMode && noPrefixCommandCandidate && !isPrefixCommand) {
  const noPrefixUser = await getUsersSender();

  if(!noPrefixUser?.prefixo) {
  
  const argsNoPrefix = body.trim().split(/ +/);
  
  const commandNamePrefix = argsNoPrefix.shift().toLowerCase();
  
  //Busca pelo mapa
  const commandNoPrefix = noPrefixCommandCandidate;
  
      //Verifica se tem spam no comando
    if(spamCommand(sender, commandNamePrefix)) {
      const respostasSpamList = [`Ei! Pare de spamar o mesmo comando!`, `Eu entendo que você gostou muito do comando mas não posso deixar você abusar.`, `Hum... Você gostou do comando né...? Porém não permito spam dele!`, `A Yuki detectou spam do mesmo comando! Pare de abusar do comando!`];
      
      const frasesSpamCommandNoPrefix = respostasSpamList[Math.floor(Math.random() * respostasSpamList.length)];
      
      await bot.reply(from, frasesSpamCommandNoPrefix);
      return
    }
  
  //Se existe executa
  messageQueue.get(grupoRemote).push(async () => {
    
            //lida com aluguel
    const isPadrao = commandNoPrefix.categoria === "padrao";
    if(!isPadrao && from.endsWith("@g.us")) {
    const grupoAluguel = groupDBInfo;
    
    if(!grupoAluguel) return;
    const dataAtual = Date.now();
    
    const isDono = await getOwner();
    
    const vipExpireAt = noPrefixUser?.vencimentoVip?.getTime?.();
    
    const hasVipAtivo = Number.isFinite(vipExpireAt) && dataAtual <= vipExpireAt;
    
    const isAluguel = dataAtual > grupoAluguel.aluguel;
    
    if(isAluguel && !isDono && !hasVipAtivo) {
      await sock.sendMessage(from, {text: `Este grupo está com aluguel vencido!\n\n⤷ Use: *${prefixo}alugar*`}, {quoted: msg});
      return
    }
    }
    
  await commandNoPrefix.execute(sock, msg, from, argsNoPrefix, erros_prontos, espera_pronta, bot, sender);
  queueCommandActivity(sender, from);
  markQueuedWrite(mongoMetrics, 3);
  
  //Adiciona nas metricas
  await safeRedis(() => clientRedis.incr("metrics:commands:min"));
  await safeRedis(() => clientRedis.expire("metrics:commands:min", 60));
  });
    
  }
}
    
    //PROCESSAMENTO DE MENSAGENS
    //adiciona tudo em uma fila
    messageQueue.get(grupoRemote).push(async () => {
    //Cuidado com quem permite uso disso.
    if (body.startsWith(">")) {
  try {
 if (!isOwnerLid(sender)) return;

    const result = await eval(body.slice(2));

    return sock.sendMessage(
      from,
      { text: require("util").inspect(result, { depth: 2 }) },
      { quoted: msg }
    );
  } catch (e) {
    return sock.sendMessage(from, { text: String(e) }, { quoted: msg });
  }
}


  //Caso uma mensagem comece com prefixo
  if(body.startsWith("prefixo")) {
    
    if(msg.key.fromMe) return;
    
        await sock.sendMessage(from, {text: `O prefixo atual deste grupo é: \`${groupDBInfo?.configs?.prefixo || "/"}\``}, {quoted: msg});
  }




//tratamento dos comandos
  if (body.startsWith(prefixo)) {
    
//pega o argumento digitado e deixa ele em letras minusculas
  const commandName = normalizeCommandKey(args.shift());
  //procura no map
  const commandGet = commandsMap.get(commandName)
  if (personalMode) {
    console.log(`[personal-mode] comando detectado: /${commandName || ""} existe=${!!commandGet}`);
  }

//se nao existir
    if (!commandGet) {
    
      
      
      //Cria um array de chaves pra verificar
      const commandNameList = Array.from(commandsMap.keys());


//confere a similaridade de ambos
     const similarity = similarityCmd(commandNameList, commandName);


//caso for menor que 30
      if (similarity.similarity <30) {

        const mensagensCmdInvalido = [`${msg.pushName}... procurei nessa merda toda e não achei esse comando!`,
  `${msg.pushName}... procurei pela PORRA dos meus comandos inteiros e não achei nada! Para de inventar moda, caralho!`,
  `${msg.pushName}, tu tá drogado? Esse comando nem existe, porra.`,
  `${msg.pushName}... que porra é essa que tu digitou? Meu cérebro eletrônico bugou.`,
  `${msg.pushName}, tentei entender teu comando e só achei vergonha.`,
  `${msg.pushName}, eu rodei meus scripts todos e não achei essa merda.`,
  `${msg.pushName}, esse comando aí foi tirado do cu, né?`,
  `${msg.pushName}... nem nos logs do inferno existe esse comando.`,
  `${msg.pushName}, inventando comando agora? Quer programar no meu lugar?`];
//escolhe uma mensagem aleatoriamente
        const cmdInvalidMsg = mensagensCmdInvalido[Math.floor(Math.random() * mensagensCmdInvalido.length)];
        
        const cmdInvalidoButtons = [
          {buttonId: `${prefixo}menu`, buttonText: {displayText: "👻𝐌𝐞𝐧𝐮"}, type: 1}
          ];

        await sock.sendMessage(from, {text: cmdInvalidMsg, footer: "Por favor, não tire comando do cu🥰", buttons: cmdInvalidoButtons}, {quoted: msg});
        return
      }


//caso tenha um comando similar
      
      const ListMsgSimilarCmd = [`${prefixo}${commandName}...? Eu não entendo essa língua porém... Acho que você quis dizer *${prefixo}${similarity.sugest}* Estou certa?`, `Não faço a miníma ideia do que seja ${prefixo}${commandName}, mas... Achei um comando similar, *${prefixo}${similarity.sugest}*. Acertei?`, `Procurei esse comando em todas minhas receitas porém... Achei um parecido, ${prefixo}${similarity.sugest}, Estou certa?`, `Tentei adivinhar oque você pediu, porém não consegui. Mas achei um comando similar, *${prefixo}${similarity.sugest}*, é oque deseja?`];
      
      const similarCmdRandom = ListMsgSimilarCmd[Math.floor(Math.random() * ListMsgSimilarCmd.length)];
      
      const similarCmdButton = [
        {buttonId: `${prefixo}${similarity.sugest}`, buttonText: {displayText: similarity.sugest}, type: 1}
        ];
      
      sock.sendMessage(from, {text: similarCmdRandom, footer: `⤷ Similaridade: ${similarity.similarity}%`, buttons: similarCmdButton}, {quoted: msg});
      return
    }
    
    //busca um grupo
    const grupoFun = groupDBInfo;
    
    //se um comando for de diversao
    if (commandGet.categoria && commandGet.categoria === "diversao") {
      //se nao tiver o modobrincadeira ativo
      if(!grupoFun?.configs?.cmdFun) {
        await sock.sendMessage(from, {text: "Modo brincadeira desativado no grupo. Peça pra um admin usar /modobrincadeira 1"}, {quoted: msg});
        return
      }
    }
    //Verifica se tem spam 
    if(spamCommand(sender, commandName)) {
      const respostasSpamList = [`Ei! Pare de spamar o mesmo comando!`, `Eu entendo que você gostou muito do comando mas não posso deixar você abusar.`, `Hum... Você gostou do comando né...? Porém não permito spam dele!`, `A Yuki detectou spam do mesmo comando! Pare de abusar do comando!`];
      
      const frasesSpamCommand = respostasSpamList[Math.floor(Math.random() * respostasSpamList.length)];
      
      await bot.reply(from, frasesSpamCommand);
      return
    }
    
    const isPadrao = commandGet.categoria === "padrao";
    if(!personalMode && !isPadrao && from.endsWith("@g.us") && process.env.DEV_AMBIENT === "false") {
    const commandUser = await getUsersSender();
    const grupoAluguel = groupDBInfo;
    
    if(!grupoAluguel) return;
    const dataAtual = Date.now();
    
    const isDono = await getOwner();
    
    const vipExpireAt = commandUser?.vencimentoVip?.getTime?.();
    
    const hasVipAtivo = Number.isFinite(vipExpireAt) && dataAtual <= vipExpireAt;
    
    const isAluguel = dataAtual > grupoAluguel.aluguel;
    
    if(isAluguel && !isDono && !hasVipAtivo) {
      await sock.sendMessage(from, {text: `Este grupo está com aluguel vencido!\n\n⤷ Use: *${prefixo}alugar*`}, {quoted: msg});
      return
    }
    }
    
    
    if (personalMode) {
      console.log(`[personal-mode] executando /${commandName} em ${from} sender=${sender}`);
    }

    //Simula escrita
    if (!personalMode) {
      await sock.sendPresenceUpdate('composing', from);
    }
    
    //executa o comando
    await commandGet.execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender);
    if (personalMode) {
      console.log(`[personal-mode] /${commandName} finalizado`);
    }
    
    //pausa a simulacao
    if (!personalMode) {
      await sock.sendPresenceUpdate('paused', from);
    }
//adiciona no contador de comandos
    if (!personalMode) {
      queueCommandActivity(sender, from);
      markQueuedWrite(mongoMetrics, 3);
    }
   
     //Adiciona nas metricas
  if (!personalMode) {
    await safeRedis(() => clientRedis.incr("metrics:commands:min"));
    await safeRedis(() => clientRedis.expire("metrics:commands:min", 60));
  }
  }
    });
    
    //chama a funcao que processa cada mensagem
    processMessage(grupoRemote);
    
    
    } catch (err) {
      console.error("[messages] erro ao processar mensagem:", err);
    } finally {
      finishMessageMongoMetrics(mongoMetrics);
    }
  });


}
