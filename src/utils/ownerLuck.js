const { isOwnerLid } = require("./owner");
const { normalizeUserLid } = require("./normalizeUserLid");

function resolveOwnerDuel(first, second) {
  const firstLid = normalizeUserLid(first);
  const secondLid = normalizeUserLid(second);
  const firstOwner = isOwnerLid(firstLid);
  const secondOwner = isOwnerLid(secondLid);

  if (firstOwner && secondOwner) {
    return {type: "draw", first: firstLid, second: secondLid};
  }

  if (firstOwner) {
    return {type: "win", winner: firstLid, loser: secondLid};
  }

  if (secondOwner) {
    return {type: "win", winner: secondLid, loser: firstLid};
  }

  return {type: "random", first: firstLid, second: secondLid};
}

function filterOwnerSafeTargets(targets) {
  const list = (targets || []).filter(Boolean);
  const safe = list.filter((target) => !isOwnerLid(target));
  return safe.length ? safe : [];
}

module.exports = {
  filterOwnerSafeTargets,
  resolveOwnerDuel
};
