const { grupos } = require("../../database/models/grupos.js");
const { clientRedis } = require("../../lib/redis.js");
const path = require("path");

module.exports = {
  name: "bot",
  categoria: "padrao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
      
      const msgEspera = await bot.reply(from, espera_pronta);
      
      const groups = await grupos.find();
      
      const gruposAtivos = groups.filter(g => {
        const agoraMs = Date.now();
        
        if(g.aluguel) {
        const vencimentoMs = g.aluguel.getTime();
        
        return vencimentoMs < agoraMs
          
        }
      });
      
      
      const ownerLink = `https://api.whatsapp.com/send/?phone=%2B558791732587&text=Oi,%20Speed&type=phone_number&app_absent=0&wame_ctl=1`
      
      const msgMinuto = await clientRedis.get("metrics:message:min");
      
      const cmdMinuto = await clientRedis.get("metrics:commands:min");
      
      const processoNode = process.uptime();
      
      const horasProcess = Math.floor(processoNode / 3600);
      
      const MinProcess = Math.floor((processoNode % 3600) / 60);
      
      const segundosProcesso = Math.floor(processoNode % 60);
      
      
      const info = `*Informações da bot:*
*Nome:* Yuki
*Dono:* Speed
> métricas
*Processo:* ${horasProcess}h ${MinProcess}m ${segundosProcesso}s 
*Grupos ativos:* ${gruposAtivos.length}
*mensagens por minuto:* ${Number(msgMinuto) + 1}
*Comandos por minuto*: ${Number(cmdMinuto) + 1}
> Links
*Canal:* https://whatsapp.com/channel/0029Vb6vMaL1t90h3jHDBC1M
*Repositório:* https://github.com/speedxzpdev/YukiV3
*Github:* @speedxzpdev
*Dono whatsapp:* ${ownerLink}`;
      
      
      await sock.sendMessage(from, {image: {url: path.join(__dirname, "../../assets/images/yukipfp/yukiStyle.jpg")}, caption: info}, {quoted: msg});
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}