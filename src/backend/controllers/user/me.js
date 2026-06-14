const { buildPanelHome } = require("../../services/panelService");
const { ensureSessionCsrf } = require("../../services/authSession");

module.exports = async (req, res) => {
  try {
    const sender = req.user?.sender;

    if(!sender) {
      res.status(401).json({error: "usuario nao logado."});
      return;
    }

    ensureSessionCsrf(req, res);
    const data = await buildPanelHome(sender);
    data.csrfToken = req.user?.csrfToken || null;
    res.status(200).json(data);
  } catch(err) {
    res.status(err?.status || 500).json({error: err?.message || "ocorreu uma falha interna."});
    if((err?.status || 500) >= 500) console.error(err);
  }
};
