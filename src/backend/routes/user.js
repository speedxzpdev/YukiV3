const { users } = require("../../database/models/users.js");
const login = require("../controllers/user/login.js");
const express = require("express");
const router = express.Router();
const isLogin = require("../middleware/isLogin");
const user_info = require("../controllers/user/userInfo.js");
const setName = require("../controllers/user/setName.js");


router.post("/login", login);

router.get("/user", user_info);

router.post("/set-name", setName);

module.exports = router;
