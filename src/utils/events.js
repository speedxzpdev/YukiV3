//Alguns eventos da propria bot
const { EventEmitter } = require("events");

//Instancia do evento
const yukiEv = new EventEmitter();
//funcao pra emitir o evento
function comprarWaifu({ctx, waifu}) {
  const eventReturn = {
    ctx: {
      user: ctx.key.participant || ctx.key.remoteJid,
      apelido: ctx.pushName ?? null,
      from: ctx.key.remoteJid
    },
    waifu,
    timestamp: Date.now()
  }
  
  yukiEv.emit("waifu:acquired", eventReturn);
}


function pagamento({ctx, obj}) {
  const eventReturn = {
    payer: ctx,
    obj,
    timestamp: Date.now()
  };
  
  yukiEv.emit("payment:completed", eventReturn)
}

module.exports = {
  yukiEv,
  comprarWaifu,
  pagamento
}