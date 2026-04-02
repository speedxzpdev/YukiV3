const { users } = require("../../../database/models/users.js");
const jwt = require("jsonwebtoken");

const info = async (req, res) => {
const user = req?.cookies?.user;

try {

if(!user) {
res.status(404).json({error: "usuario nao registrado ou encontrado."});
return;
}

const token = jwt.verify(user, process.env.SECRET);

const userdb = await users.findOne({userLid: token.sender});

res.status(200).json({userdb});

}
catch(err) {
res.status(500).json({error: "ocorreu uma falha interna"});
console.error(err);
}

}

module.exports = info
