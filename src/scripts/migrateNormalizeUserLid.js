require("dotenv").config();
const mongoose = require("mongoose");
const { users } = require("../database/models/users");
const { normalizeUserLid } = require("../utils/normalizeUserLid");

function mergeUniqueObjects(list = [], keyField = "id") {
  const map = new Map();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;

    const key =
      keyField && item[keyField] != null
        ? `${keyField}:${item[keyField]}`
        : JSON.stringify(item);

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

function mergeDates(dates = [], pick = "max") {
  const validDates = dates.filter(Boolean).map((date) => new Date(date));
  if (!validDates.length) return null;

  return pick === "min"
    ? new Date(Math.min(...validDates.map((date) => date.getTime())))
    : new Date(Math.max(...validDates.map((date) => date.getTime())));
}

function pickFirstTruthy(values = []) {
  return values.find(Boolean) ?? null;
}

async function main() {
  await mongoose.connect(process.env.URIDB);

  const allUsers = await users.find({});
  const groups = new Map();

  for (const user of allUsers) {
    const canonical = normalizeUserLid(user.userLid);
    if (!canonical) continue;

    if (!groups.has(canonical)) {
      groups.set(canonical, []);
    }

    groups.get(canonical).push(user);
  }

  let mergedGroups = 0;
  let deletedDocs = 0;

  for (const [canonicalId, docs] of groups.entries()) {
    if (docs.length === 1 && docs[0].userLid === canonicalId) {
      continue;
    }

    const canonicalDoc =
      docs.find((doc) => doc.userLid === canonicalId) || docs[0];

    const merged = {
      userLid: canonicalId,
      name: pickFirstTruthy(docs.map((doc) => doc.name)) || "Sem nome",
      bio: pickFirstTruthy(docs.map((doc) => doc.bio)) || "OlA, amo a Yuki!",
      isVip: docs.some((doc) => doc.isVip),
      vencimentoVip: mergeDates(docs.map((doc) => doc.vencimentoVip), "max"),
      registro: mergeDates(docs.map((doc) => doc.registro), "min") || new Date(),
      prefixo: docs.some((doc) => doc.prefixo !== false),
      daily: mergeDates(docs.map((doc) => doc.daily), "max"),
      waifus: mergeUniqueObjects(docs.flatMap((doc) => doc.waifus || [])),
      conquistas: mergeUniqueObjects(docs.flatMap((doc) => doc.conquistas || [])),
      dinheiro: Math.max(...docs.map((doc) => Number(doc.dinheiro || 0))),
      donwloads: docs.reduce((sum, doc) => sum + Number(doc.donwloads || 0), 0),
      figurinhas: docs.reduce((sum, doc) => sum + Number(doc.figurinhas || 0), 0),
      cmdCount: docs.reduce((sum, doc) => sum + Number(doc.cmdCount || 0), 0),
      level: Math.max(...docs.map((doc) => Number(doc.level || 0))),
      xp: docs.reduce((sum, doc) => sum + Number(doc.xp || 0), 0),
      proximolevel: Math.max(...docs.map((doc) => Number(doc.proximolevel || 100))),
      grupos: mergeUniqueObjects(docs.flatMap((doc) => doc.grupos || [])),
      casal: {
        parceiro: pickFirstTruthy(docs.map((doc) => doc?.casal?.parceiro)),
        pedido: mergeDates(docs.map((doc) => doc?.casal?.pedido), "max"),
        filhos: Array.from(
          new Set(docs.flatMap((doc) => doc?.casal?.filhos || []).filter(Boolean))
        )
      }
    };

    await users.updateOne(
      { _id: canonicalDoc._id },
      { $set: merged },
      { runValidators: false }
    );

    const duplicateIds = docs
      .filter((doc) => String(doc._id) !== String(canonicalDoc._id))
      .map((doc) => doc._id);

    if (duplicateIds.length) {
      const result = await users.deleteMany({ _id: { $in: duplicateIds } });
      deletedDocs += result.deletedCount || 0;
    }

    mergedGroups += 1;
    console.log(
      `Mesclado ${canonicalId}: ${docs.length} registros -> 1 registro canOnico`
    );
  }

  await users.collection.createIndex({ userLid: 1 }, { unique: true });

  console.log(
    JSON.stringify(
      {
        mergedGroups,
        deletedDocs,
        totalUsersAfter: await users.countDocuments()
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
