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

module.exports = {
  buildCommandCatalog
};
