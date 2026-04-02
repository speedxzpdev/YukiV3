const { users } = require("../../../database/models/users.js");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
const user = req?.cookies?.user;
const nome = req?.body?.nome;

try {
if(!user || !nome) {
res.status(404).json({error: "requicição mal feita."});
return;
}

const jwtsender = jwt.verify(user, process.env.SECRET);

await users.updateOne({userLid: jwtsender.sender}, {$set: {name: nome}}, {upsert: true});

res.status(200).json({message: "nome trocado com sucesso!"});

}
catch(err) {
console.log(err);
res.status(500).json({error: "ocorreu um erro interno"});
}
}
