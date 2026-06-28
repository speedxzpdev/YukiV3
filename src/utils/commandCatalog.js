function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferGroup(command) {
  const folder = cleanText(command.__folder || command.categoria || "geral").toLowerCase();
  return folder || "geral";
}

function publicName(name) {
  return cleanText(name).replace(/^\//, "");
}

const COMMAND_HINTS = {
  alugar: "aluga a Yuki para um grupo por quantidade de dias.",
  ban: "remove alguem do grupo, se quem usa tiver permissao.",
  "ban-bot": "ban global: faz a Yuki ignorar um usuario. So donos reais.",
  bolao: "lista, cria, anuncia e gerencia bolao com dinheiro virtual.",
  "bolão": "alias de /bolao.",
  coinflipbet: "desafia alguem para cara ou coroa apostando dinheiro virtual.",
  deactiveodd: "comando discreto de dono real para desligar protecao de sorte.",
  activeodd: "comando discreto de dono real para ligar protecao de sorte.",
  download: "baixa video do TikTok e oferece opcoes de envio.",
  entrarPainel: "login do painel pelo codigo confirmado no WhatsApp.",
  entrarpainel: "login do painel pelo codigo confirmado no WhatsApp.",
  gerartoken: "gera token temporario de uso web.",
  menu: "mostra o menu principal da Yuki.",
  mute: "muta alguem no grupo, se quem usa tiver permissao.",
  painel: "gera link privado para acessar o painel web da Yuki.",
  play: "busca no YouTube e envia audio/musica.",
  reels: "baixa reels do Instagram.",
  saldo: "mostra o dinheiro virtual do usuario.",
  sticker: "cria figurinha a partir de imagem/video.",
  s: "alias de /sticker.",
  tiktok: "baixa video do TikTok.",
  tiktokmp3: "baixa audio de TikTok.",
  toimg: "converte figurinha respondida para imagem ou video.",
  transferir: "transfere dinheiro virtual para outro usuario.",
  unban: "remove ban global da Yuki. So donos reais.",
  unmute: "remove mute de usuario no grupo."
};

const KEYWORD_HINTS = [
  {pattern: /\b(play|musica|m[uú]sica|youtube|tocar)\b/i, commands: ["play"]},
  {pattern: /\b(download|baixar|tiktok|video|v[ií]deo)\b/i, commands: ["download", "tiktok"]},
  {pattern: /\b(reels|instagram|insta)\b/i, commands: ["reels"]},
  {pattern: /\b(painel|dashboard|site|login)\b/i, commands: ["painel", "entrarpainel"]},
  {pattern: /\b(bol[aã]o|aposta|apostar|jogo)\b/i, commands: ["bolao", "coinflipbet"]},
  {pattern: /\b(saldo|dinheiro|moeda|moedas)\b/i, commands: ["saldo", "transferir"]},
  {pattern: /\b(figurinha|sticker|stiker|webp)\b/i, commands: ["sticker", "toimg"]},
  {pattern: /\b(mute|mutar|silenciar|unmute|desmutar)\b/i, commands: ["mute", "unmute"]},
  {pattern: /\b(ban|banir|unban|desbanir)\b/i, commands: ["ban", "ban-bot", "unban"]},
  {pattern: /\b(alugar|aluguel|pagar|pagamento)\b/i, commands: ["alugar"]},
  {pattern: /\b(menu|comandos|cmds|ajuda)\b/i, commands: ["menu"]}
];

function commandLookup(commandsMap) {
  const lookup = new Map();
  for (const [key, command] of commandsMap.entries()) {
    const name = publicName(key || command.name).toLowerCase();
    if (name) lookup.set(name, command);
  }
  return lookup;
}

function buildCommandCatalog(commandsMap) {
  const seen = new Set();
  const groups = new Map();

  for (const [key, command] of commandsMap.entries()) {
    const name = publicName(key || command.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const group = inferGroup(command);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(name);
  }

  const preferredOrder = ["geral", "grupo", "admin", "economia", "api", "fun", "donos"];
  const orderedGroups = [
    ...preferredOrder.filter((group) => groups.has(group)),
    ...Array.from(groups.keys()).filter((group) => !preferredOrder.includes(group)).sort()
  ];

  return {
    count: seen.size,
    text: orderedGroups.map((group) => {
      const names = groups.get(group).sort((a, b) => a.localeCompare(b, "pt-BR"));
      return `${group}: ${names.map((name) => `/${name}`).join(", ")}`;
    }).join("\n")
  };
}

function findRelevantCommandContext(commandsMap, texts, limit = 5) {
  const lookup = commandLookup(commandsMap);
  const joined = (Array.isArray(texts) ? texts : [texts])
    .map((text) => cleanText(text))
    .filter(Boolean)
    .join("\n");

  if (!joined) return null;

  const wanted = [];
  const add = (name) => {
    const clean = publicName(name).toLowerCase();
    if (clean && lookup.has(clean) && !wanted.includes(clean)) wanted.push(clean);
  };

  const slashMatches = joined.match(/\/([\p{L}\p{N}_-]+)/giu) || [];
  for (const match of slashMatches) add(match.slice(1));

  for (const [name] of lookup.entries()) {
    if (wanted.length >= limit) break;
    if (name.length < 4) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(joined)) add(name);
  }

  for (const hint of KEYWORD_HINTS) {
    if (wanted.length >= limit) break;
    if (hint.pattern.test(joined)) {
      for (const command of hint.commands) add(command);
    }
  }

  if (!wanted.length) return null;

  const lines = wanted.slice(0, limit).map((name) => {
    const command = lookup.get(name);
    const group = inferGroup(command);
    const hint = COMMAND_HINTS[name] || "comando real da Yuki.";
    return `/${name} (${group}): ${hint}`;
  });

  return {
    names: wanted.slice(0, limit),
    text: lines.join("\n")
  };
}

module.exports = {
  buildCommandCatalog,
  findRelevantCommandContext
};
