const login = require("../controllers/user/login.js");
const express = require("express");
const router = express.Router();
const isLogin = require("../middleware/isLogin");
const user_info = require("../controllers/user/userInfo.js");
const me = require("../controllers/user/me.js");
const panel = require("../controllers/user/panel.js");
const setName = require("../controllers/user/setName.js");
const discord_auth = require('../controllers/user/discordAuth.js');


router.post("/login", login);

router.get("/user", user_info);

router.get("/me", isLogin, me);

router.get("/panel/groups/:groupId", isLogin, panel.groupDetails);

router.patch("/panel/groups/:groupId/config", isLogin, panel.updateConfig);

router.post("/panel/groups/:groupId/actions", isLogin, panel.groupAction);

router.post("/panel/announcements/preview", isLogin, panel.announcementPreview);

router.post("/panel/announcements/confirm", isLogin, panel.announcementConfirm);

router.post("/set-name", setName);

router.get("/discord", discord_auth);

module.exports = router;
