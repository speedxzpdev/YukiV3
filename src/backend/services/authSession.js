const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

function cookieOptions() {
  const isProd = process.env.DEV_AMBIENT === "false";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    maxAge: COOKIE_MAX_AGE
  };
}

function createSessionPayload(sender) {
  return {
    sender,
    csrfToken: crypto.randomBytes(32).toString("hex")
  };
}

function signSession(payload) {
  return jwt.sign(payload, process.env.SECRET);
}

function setSessionCookie(res, payload) {
  const tokenJwt = signSession(payload);
  res.cookie("user", tokenJwt, cookieOptions());
  return tokenJwt;
}

function issueSession(res, sender) {
  const payload = createSessionPayload(sender);
  const tokenJwt = setSessionCookie(res, payload);
  return {payload, tokenJwt};
}

function ensureSessionCsrf(req, res) {
  if (!req.user?.sender || req.user.csrfToken) return req.user;

  req.user = {
    ...req.user,
    csrfToken: crypto.randomBytes(32).toString("hex")
  };
  setSessionCookie(res, req.user);
  return req.user;
}

module.exports = {
  cookieOptions,
  ensureSessionCsrf,
  issueSession,
  setSessionCookie
};
