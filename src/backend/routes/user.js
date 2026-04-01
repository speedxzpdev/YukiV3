const { users } = require("../../database/models/users.js");
const login = require("../controllers/user/login.js");
const express = require("express");
const router = express.Router();



router.post("/login", login);


module.exports = router;
