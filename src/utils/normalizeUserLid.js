function normalizeUserLid(rawId) {
  if (!rawId || typeof rawId !== "string") return null;

  const trimmed = rawId.trim();
  if (!trimmed) return null;

  const [localPart, domainPart] = trimmed.split("@");
  const baseLocal = (localPart || "").split(":")[0];

  if (!baseLocal) return null;

  if (domainPart) {
    if (domainPart === "g.us" || domainPart === "broadcast") {
      return `${baseLocal}@${domainPart}`;
    }

    return `${baseLocal}@lid`;
  }

  return `${baseLocal}@lid`;
}

module.exports = {
  normalizeUserLid
};
