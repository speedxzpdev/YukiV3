const { users } = require("../database/models/users.js");

async function addXp(user, quantidade, sock, from, msg) {
  try {
    
    const userFind = await users.findOneAndUpdate({userLid: user}, {$inc: {xp: quantidade}}, {upsert: true, new: true});
    
    //const proximoNivel = (userFind?.proximolevel || 100) + 100;
    
    if(userFind?.xp > userFind.proximolevel) {
      
      await sock.sendMessage(from, {text: "Up!"}, {quoted: msg});
      
      const level = await users.findOneAndUpdate({userLid: user}, {$inc: {level: 1, proximolevel: 100}}, {upsert: true, new: true});
      
      let senderProfile;
      
      try {
        senderProfile = await sock.profilePictureUrl(user, 'image');
      }
      catch(err) {
        senderProfile = "https://files.catbox.moe/0ug48m";
      }
      
      const pushname = msg?.pushName || "Sem nome"
      
      const imageXp = `https://zero-two-apis.com.br/api/canvas/levelup2?foto=${encodeURIComponent("https://files.catbox.moe/0ug48m")}&nome=${encodeURIComponent(pushname)}&lvb=${userFind?.level}&lva=${level?.level}&fundo=https://files.catbox.moe/b05qkn`
      
      console.log(imageXp)
      
      const button = [
        {buttonId: `${process.env.PREFIXO}perfil`, buttonText: {displayText: "𝐕𝐞𝐫 𝐏𝐞𝐫𝐟𝐢𝐥 ✨"}, type: 1}
        ];
      
      await sock.sendMessage(from, {image: {url: imageXp}, caption: `Parabéns ${pushname}🎉 Você acaba de subir de nível🔥`, buttons: button});
      
    }
    
    
    
    
  }
  catch(err) {
    console.error(err);
  }
  
}

module.exports = addXp;