const { yukiEv } = require("../utils/events.js");
require("dotenv").config();
const path = require("path");

module.exports = (sock) => {
  
  yukiEv.on("waifu:acquired", async (ctx) => {
    console.log(ctx);
    
    if(process.env.DEV_AMBIENT === "true" && ctx.ctx.from !== '120363424415515445@g.us') return;
    
    const legenda = `O @${ctx.ctx.user.split("@")[0]}, adquiriu a ${ctx.waifu.nome}!
⤷ Raridade: ${ctx.waifu.raridade}
⤷ Preço: ${ctx.waifu.preco}`
    
    console.log(legenda);
    
    await sock.sendMessage(ctx.ctx.from, {image: {url: path.join(__dirname, `../${ctx.waifu.img.split("/").slice(2).join("/")}`)}, caption: legenda, mentions: [ctx.ctx.user]});
  });
  
}