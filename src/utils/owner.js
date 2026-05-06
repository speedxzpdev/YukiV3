const { normalizeUserLid } = require("./normalizeUserLid");
const { ownerLids } = require("../config");

function isOwnerLid(rawId) {
  const normalized = normalizeUserLid(rawId);
  if (!normalized) return false;

  return ownerLids.includes(normalized);
}

module.exports = {
  isOwnerLid
};
