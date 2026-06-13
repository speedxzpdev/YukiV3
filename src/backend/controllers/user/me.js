const { advertidos } = require("../../../database/models/adverts");
const { grupos } = require("../../../database/models/grupos");
const { mutados } = require("../../../database/models/mute");
const { rankativos } = require("../../../database/models/rankativos");
const { users } = require("../../../database/models/users");

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function addGroupId(set, groupId) {
  if (typeof groupId === "string" && groupId.endsWith("@g.us")) {
    set.add(groupId);
  }
}

module.exports = async (req, res) => {
  try {
    const sender = req.user?.sender;

    if(!sender) {
      res.status(401).json({error: "usuario nao logado."});
      return;
    }

    const [user, mutes, adverts, ranks] = await Promise.all([
      users.findOne({userLid: sender}).lean(),
      mutados.find({userLid: sender}).lean(),
      advertidos.find({userLid: sender}).lean(),
      rankativos.find({userLid: sender}).lean()
    ]);

    if(!user) {
      res.status(404).json({error: "usuario nao encontrado."});
      return;
    }

    const groupIds = new Set();
    for (const group of user.grupos || []) addGroupId(groupIds, group?.id);
    for (const mute of mutes) addGroupId(groupIds, mute?.grupo);
    for (const adv of adverts) addGroupId(groupIds, adv?.grupo);
    for (const rank of ranks) addGroupId(groupIds, rank?.from);

    const groupDocs = groupIds.size
      ? await grupos.find({groupId: {$in: Array.from(groupIds)}}).lean()
      : [];

    const savedGroups = new Map((user.grupos || []).map((group) => [group.id, group]));
    const groupInfo = new Map(groupDocs.map((group) => [group.groupId, group]));
    const muteInfo = new Map(mutes.map((mute) => [mute.grupo, mute]));
    const advertInfo = new Map(adverts.map((adv) => [adv.grupo, adv]));
    const rankInfo = new Map(ranks.map((rank) => [rank.from, rank]));

    const groups = Array.from(groupIds).map((groupId) => {
      const saved = savedGroups.get(groupId);
      const group = groupInfo.get(groupId);
      const mute = muteInfo.get(groupId);
      const adv = advertInfo.get(groupId);
      const rank = rankInfo.get(groupId);

      return {
        groupId,
        name: group?.grupoName || saved?.nome || "Sem nome",
        isAdminRegistered: !!saved,
        muted: !!mute,
        muteAttempts: mute?.tentativasMsg || 0,
        advertencias: adv?.adv || 0,
        messages: rank?.msg || 0,
        commands: rank?.cmdUsados || 0,
        aluguel: toIso(group?.aluguel)
      };
    });

    res.status(200).json({
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
        discordConnected: !!user.discord_id,
        discordName: user.discord_name || null,
        spotifyConnected: !!user.spotifyToken?.refresh
      },
      groups
    });
  } catch(err) {
    res.status(500).json({error: "ocorreu uma falha interna."});
    console.error(err);
  }
};
