const islogger = (req, res, next) => {
const token = req.cookies.user;

try {

if(!token) {
  res.status(400).json({erro: "usuario nao logado."});
return;

}

next();

}
catch(err) {
res.status(400).json({error: "token inválido."});
console.error(err);

}


}
