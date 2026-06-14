const {
  confirmAnnouncement,
  createAnnouncementPreview,
  decodeGroupId,
  getGroupPanel,
  runGroupAction,
  updateGroupConfig
} = require("../../services/panelService");

function getSender(req) {
  const sender = req.user?.sender;
  if (!sender) throw Object.assign(new Error("usuario nao logado."), {status: 401});
  return sender;
}

function assertCsrf(req) {
  const expected = req.user?.csrfToken;
  const received = req.headers["x-csrf-token"];
  if (!expected || !received || expected !== received) {
    throw Object.assign(new Error("csrf invalido."), {status: 403});
  }
}

function sendError(res, err) {
  const status = err?.status || 500;
  res.status(status).json({error: err?.message || "ocorreu uma falha interna."});
  if (status >= 500) console.error(err);
}

async function groupDetails(req, res) {
  try {
    const sender = getSender(req);
    const groupId = decodeGroupId(req.params.groupId);
    const data = await getGroupPanel(req.activeSock, groupId, sender);
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
}

async function updateConfig(req, res) {
  try {
    assertCsrf(req);
    const sender = getSender(req);
    const groupId = decodeGroupId(req.params.groupId);
    const group = await updateGroupConfig(req.activeSock, groupId, sender, req.body || {});
    res.status(200).json({group});
  } catch (err) {
    sendError(res, err);
  }
}

async function groupAction(req, res) {
  try {
    assertCsrf(req);
    const sender = getSender(req);
    const groupId = decodeGroupId(req.params.groupId);
    const result = await runGroupAction(req.activeSock, groupId, sender, req.body || {});
    res.status(200).json(result);
  } catch (err) {
    sendError(res, err);
  }
}

async function announcementPreview(req, res) {
  try {
    assertCsrf(req);
    const sender = getSender(req);
    const preview = await createAnnouncementPreview(sender, req.body || {});
    res.status(200).json({preview});
  } catch (err) {
    sendError(res, err);
  }
}

async function announcementConfirm(req, res) {
  try {
    assertCsrf(req);
    const sender = getSender(req);
    const result = await confirmAnnouncement(req.activeSock, sender, req.body?.previewId);
    res.status(202).json(result);
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  announcementConfirm,
  announcementPreview,
  groupAction,
  groupDetails,
  updateConfig
};
