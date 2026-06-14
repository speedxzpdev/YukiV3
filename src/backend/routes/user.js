const login = require("../controllers/user/login.js");
const express = require("express");
const router = express.Router();
const isLogin = require("../middleware/isLogin");
const user_info = require("../controllers/user/userInfo.js");
const me = require("../controllers/user/me.js");
const panel = require("../controllers/user/panel.js");
const browserLogin = require("../controllers/user/browserLogin.js");
const setName = require("../controllers/user/setName.js");
const discord_auth = require('../controllers/user/discordAuth.js');


router.post("/login", login);

router.post("/browser-login/start", browserLogin.start);

router.get("/browser-login/status/:code", browserLogin.status);

router.get("/user", user_info);

router.get("/me", isLogin, me);

router.get("/public/bolao/:gameId", panel.bolaoPublicDetails);

router.get("/panel/bolao", isLogin, panel.bolaoHome);

router.post("/panel/bolao/games", isLogin, panel.bolaoCreateGame);

router.get("/panel/bolao/:gameId", isLogin, panel.bolaoDetails);

router.post("/panel/bolao/:gameId/bets", isLogin, panel.bolaoBet);

router.post("/panel/bolao/:gameId/result", isLogin, panel.bolaoResultPreview);

router.post("/panel/bolao/:gameId/payout", isLogin, panel.bolaoPayoutConfirm);

router.get("/panel/groups/:groupId", isLogin, panel.groupDetails);

router.get("/panel/groups", isLogin, panel.listGroups);

router.patch("/panel/groups/:groupId/config", isLogin, panel.updateConfig);

router.post("/panel/groups/:groupId/actions", isLogin, panel.groupAction);

router.post("/panel/announcements/preview", isLogin, panel.announcementPreview);

router.post("/panel/announcements/confirm", isLogin, panel.announcementConfirm);

router.post("/set-name", setName);

router.get("/discord", discord_auth);

module.exports = router;
