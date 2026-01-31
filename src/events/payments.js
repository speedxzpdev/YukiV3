const { yukiEv } = require("../utils/events.js");
const { numberOwner } = require("../config.js");

module.exports = (sock) => {
  yukiEv.on("payment:completed", async (pay) => {
    const user = pay?.payer?.user;
    const from = pay?.payer?.from;
    const valor = pay?.payer?.valor;
    
    const info = `*Um pagamento foi concluído🥳🎉🎉*
⤷ *Pagador:* @${user.split("@")[0]}
⤷ *Valor:* ${valor}
⤷ *Id do pagamento:* ${pay?.obj?.id}
⤷ *Categoria:* ${pay?.obj?.categorias}
⤷ *Descrição:* ${pay?.obj?.descricao}
⤷ *Data:* ${new Date(pay?.timestamp).toLocaleDateString("pt-BR")}

*Envie o valor para:*
⤷ *Nome:* João Guilherme Freire Bezerra Leite
⤷ *Chave-pix:* 13948681465
⤷ *Banco:* Mercado Pago`
    
    //Envia pro dono
    await sock.sendMessage(numberOwner, {text: info, mentions: [user]});
    
    //Envia pra o dono do token do Mp 
    await sock.sendMessage(process.env.OWNER_MP, {text: info, mentions: [user]});
    
    
    await sock.sendMessage(from, {text: `O @${user.split("@")[0]} fez a boa bancando aluguel da Yuki pro grupo🥳🎉 Para mais informações use /grupoinfo`, mentions: [user]});
    
  })
}