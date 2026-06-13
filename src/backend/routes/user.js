const login = require("../controllers/user/login.js");
const express = require("express");
const router = express.Router();
const isLogin = require("../middleware/isLogin");
const user_info = require("../controllers/user/userInfo.js");
const me = require("../controllers/user/me.js");
const setName = require("../controllers/user/setName.js");
const discord_auth = require('../controllers/user/discordAuth.js');


router.post("/login", login);

router.get("/user", user_info);

router.get("/me", isLogin, me);

router.post("/set-name", setName);

router.get("/discord", discord_auth);

module.exports = router;
