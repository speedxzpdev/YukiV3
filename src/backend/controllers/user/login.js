const { clientRedis } = require("../../../lib/redis.js");
const { issueSession } = require("../../services/authSession");

module.exports = async (req, res)  => {
const body = req?.body;

try {

 if(!body || !body.token) {
   res.status(400).json({error: "falta parâmetros."});
   return;
}


  const tokenKey = `token:${body.token}`;
  const token_exists = await clientRedis.exists(tokenKey);

  if(!token_exists) {

    res.status(404).json({error: "token inválido ou expirado."});
    return;

}

 const sender = await clientRedis.get(tokenKey);

 if(!sender) {
   res.status(404).json({error: "token inválido ou expirado."});
   return;
 }

 await clientRedis.del([tokenKey, `userToken:${sender}`]);

 const {tokenJwt} = issueSession(res, sender);

 res.status(200).json({token: tokenJwt, message: "sucesso!"});


}
 
catch(err) {
res.status(500).json({error: "Ocorreu uma falha interna."});
console.error(err);
}

}
