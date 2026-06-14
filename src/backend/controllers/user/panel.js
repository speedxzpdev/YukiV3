// redeploy trigger
const {
  confirmAnnouncement,
  createAnnouncementPreview,
  decodeGroupId,
  getGroupPanel,
  listManageableGroups,
  runGroupAction,
  updateGroupConfig
} = require("../../services/panelService");
const {
  confirmPayout,
  createGame,
  createResultPreview,
  getPanelBolaoGame,
  listPanelBolao,
  placeOrUpdateBet,
  serializeGame
} = require("../../../services/bolaoService");

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

async function listGroups(req, res) {
  try {
    const sender = getSender(req);
    const groups = await listManageableGroups(sender, req.query?.q || "");
    res.status(200).json({groups});
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

async function bolaoHome(req, res) {
  try {
    const data = await listPanelBolao(getSender(req));
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
}

async function bolaoDetails(req, res) {
  try {
    const data = await getPanelBolaoGame(getSender(req), req.params.gameId);
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
}

async function bolaoBet(req, res) {
  try {
    assertCsrf(req);
    const result = await placeOrUpdateBet({
      gameId: req.params.gameId,
      sender: getSender(req),
      homeScore: req.body?.homeScore,
      awayScore: req.body?.awayScore,
      amount: req.body?.amount
    });
    res.status(200).json(result);
  } catch (err) {
    sendError(res, err);
  }
}

async function bolaoCreateGame(req, res) {
  try {
    assertCsrf(req);
    const game = await createGame({
      homeTeam: req.body?.homeTeam,
      awayTeam: req.body?.awayTeam,
      competition: req.body?.competition,
      startsAt: req.body?.startsAt
    }, getSender(req));
    res.status(201).json({game: serializeGame(game)});
  } catch (err) {
    sendError(res, err);
  }
}

async function bolaoResultPreview(req, res) {
  try {
    assertCsrf(req);
    const game = await createResultPreview(req.params.gameId, getSender(req), {
      homeScore: req.body?.homeScore,
      awayScore: req.body?.awayScore
    });
    res.status(200).json({game});
  } catch (err) {
    sendError(res, err);
  }
}

async function bolaoPayoutConfirm(req, res) {
  try {
    assertCsrf(req);
    const game = await confirmPayout(req.params.gameId, getSender(req));
    res.status(200).json({game});
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  announcementConfirm,
  announcementPreview,
  bolaoBet,
  bolaoCreateGame,
  bolaoDetails,
  bolaoHome,
  bolaoPayoutConfirm,
  bolaoResultPreview,
  groupAction,
  groupDetails,
  listGroups,
  updateConfig
};
