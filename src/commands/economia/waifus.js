const { users } = require("../../database/models/users.js");


module.exports = {
    name: "waifus",
    async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
        try {

            const user = await users.findOne({userLid: sender});

            const waifusInv = user.waifus.map((item, index) => {
                return `${index + 1}º ${item.nome}
*Raridade:* ${item.raridade}
*Preço:* ${item.preco}`
            });

            const message = `*Inventário de* @${sender.split("@")[0]}\n\n${waifusInv.join("\n\n")}`;

            await sock.sendMessage(from, {text: message, mentions: [sender]}, {quoted: msg});


        }
        catch(err) {
            console.error(err);
            await bot.reply(from, erros_prontos);
        }
    }
}