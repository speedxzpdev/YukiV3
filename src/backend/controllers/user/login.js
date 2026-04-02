const { clientRedis } = require("../../../lib/redis.js");
const jwt = require("jsonwebtoken");

module.exports = async (req, res)  => {
const body = req?.body;

try {

 if(!body || !body.token) {
   res.status(400).json({error: "falta parâmetros."});
   return;
}


  const token_exists = await clientRedis.exists(`token:${body?.token}`);

  if(!token_exists) {

    res.status(404).json({error: "token inválido ou expirado."});
    return;

}

 const sender = await clientRedis.get(`token:${body?.token}`);

 const tokenJwt = jwt.sign({sender: sender}, process.env.SECRET);

 res.cookie('user', tokenJwt, {
   httpOnly: true,
   secure: false,
   maxAge: 1000 * 60 * 60 * 24
});

 res.status(200).json({token: tokenJwt, message: "sucesso!"});


}
 
catch(err) {
res.status(500).json({error: "Ocorreu uma falha interna."});
console.error(err);
}

}
