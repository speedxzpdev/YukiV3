function normalizeUserLid(rawId) {
  if (!rawId || typeof rawId !== "string") return null;

  const trimmed = rawId.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("@");
  const localPart = (parts[0] || "").split(":")[0];
  const domainPart = parts[1];

  if (!localPart) return null;

  if (!domainPart) return localPart + "@lid";
  if (domainPart === "g.us" || domainPart === "broadcast") {
    return localPart + "@" + domainPart;
  }
  return localPart + "@lid";
}

function mergeUniqueObjects(list, keyField) {
  const map = new Map();

  (list || []).forEach((item) => {
    if (!item || typeof item !== "object") return;

    const key =
      keyField && item[keyField] != null
        ? keyField + ":" + item[keyField]
        : JSON.stringify(item);

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

function mergeDates(dates, pick) {
  const validDates = (dates || [])
    .filter(Boolean)
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (!validDates.length) return null;

  const timestamps = validDates.map((date) => date.getTime());
  return new Date(pick === "min" ? Math.min.apply(null, timestamps) : Math.max.apply(null, timestamps));
}

function firstTruthy(values) {
  for (const value of values || []) {
    if (value) return value;
  }
  return null;
}

const allUsers = db.users.find().toArray();
const groups = new Map();

allUsers.forEach((user) => {
  const canonical = normalizeUserLid(user.userLid);
  if (!canonical) return;

  if (!groups.has(canonical)) {
    groups.set(canonical, []);
  }

  groups.get(canonical).push(user);
});

let mergedGroups = 0;
let deletedDocs = 0;

for (const [canonicalId, docs] of groups.entries()) {
  if (docs.length === 1 && docs[0].userLid === canonicalId) {
    continue;
  }

  const canonicalDoc = docs.find((doc) => doc.userLid === canonicalId) || docs[0];
  const merged = {
    userLid: canonicalId,
    name: firstTruthy(docs.map((doc) => doc.name)) || "Sem nome",
    bio: firstTruthy(docs.map((doc) => doc.bio)) || "Ola, amo a Yuki!",
    isVip: docs.some((doc) => !!doc.isVip),
    vencimentoVip: mergeDates(docs.map((doc) => doc.vencimentoVip), "max"),
    registro: mergeDates(docs.map((doc) => doc.registro), "min") || new Date(),
    prefixo: docs.some((doc) => doc.prefixo !== false),
    daily: mergeDates(docs.map((doc) => doc.daily), "max"),
    waifus: mergeUniqueObjects(docs.flatMap((doc) => doc.waifus || [])),
    conquistas: mergeUniqueObjects(docs.flatMap((doc) => doc.conquistas || [])),
    dinheiro: Math.max.apply(null, docs.map((doc) => Number(doc.dinheiro || 0))),
    donwloads: docs.reduce((sum, doc) => sum + Number(doc.donwloads || 0), 0),
    figurinhas: docs.reduce((sum, doc) => sum + Number(doc.figurinhas || 0), 0),
    cmdCount: docs.reduce((sum, doc) => sum + Number(doc.cmdCount || 0), 0),
    level: Math.max.apply(null, docs.map((doc) => Number(doc.level || 0))),
    xp: docs.reduce((sum, doc) => sum + Number(doc.xp || 0), 0),
    proximolevel: Math.max.apply(null, docs.map((doc) => Number(doc.proximolevel || 100))),
    grupos: mergeUniqueObjects(docs.flatMap((doc) => doc.grupos || []), "id"),
    casal: {
      parceiro: firstTruthy(docs.map((doc) => doc.casal && doc.casal.parceiro)),
      pedido: mergeDates(docs.map((doc) => doc.casal && doc.casal.pedido), "max"),
      filhos: Array.from(new Set(docs.flatMap((doc) => (doc.casal && doc.casal.filhos) || []).filter(Boolean)))
    }
  };

  db.users.updateOne({ _id: canonicalDoc._id }, { $set: merged });

  const duplicateIds = docs
    .filter((doc) => String(doc._id) !== String(canonicalDoc._id))
    .map((doc) => doc._id);

  if (duplicateIds.length) {
    const result = db.users.deleteMany({ _id: { $in: duplicateIds } });
    deletedDocs += result.deletedCount || 0;
  }

  mergedGroups += 1;
  print("Mesclado " + canonicalId + ": " + docs.length + " registros -> 1");
}

db.users.createIndex({ userLid: 1 }, { unique: true });

printjson({
  mergedGroups,
  deletedDocs,
  totalUsersAfter: db.users.countDocuments()
});
