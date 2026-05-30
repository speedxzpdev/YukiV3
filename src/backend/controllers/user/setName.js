const jwt = require("jsonwebtoken");
const { updateUserAndCache } = require("../../../utils/dbHelpers.js");

module.exports = async (req, res) => {
const user = req?.cookies?.user;
const nome = req?.body?.nome;

try {
if(!user || !nome) {
res.status(404).json({error: "requicição mal feita."});
return;
}

const jwtsender = jwt.verify(user, process.env.SECRET);

await updateUserAndCache(jwtsender.sender, {$set: {name: nome}}, {upsert: true, name: nome});

res.status(200).json({message: "nome trocado com sucesso!"});

}
catch(err) {
console.log(err);
res.status(500).json({error: "ocorreu um erro interno"});
}
}
