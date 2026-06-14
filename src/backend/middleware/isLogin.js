const jwt = require("jsonwebtoken");
const { ensureSessionCsrf } = require("../services/authSession");

const islogger = (req, res, next) => {
  const token = req.cookies.user;

  try {
    if(!token) {
      res.status(401).json({erro: "usuario nao logado."});
      return;
    }

    req.user = jwt.verify(token, process.env.SECRET);
    ensureSessionCsrf(req, res);
    next();
  } catch(err) {
    res.status(401).json({error: "token invalido."});
    if(err?.name !== "JsonWebTokenError") console.error(err);
  }
};

module.exports = islogger;
