const { clientRedis } = require("../../lib/redis.js");
const crypto = require('crypto');

module.exports = {
    name: "discord",
    categoria: "padrao",
    async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {

        const token = crypto.randomBytes(32).toString("hex");

        await clientRedis.multi().hSet(token, {
            userLid: sender
        }).expire(token, 3600).exec();

        const url = process.env.DISCORD_AUTH + `&state=${token}`;

        const serverUrl = process.env.SERVER_URL;

        await bot.reply(sender, "Minha irmã Shizuko acabou de me enviar este link para se conectar ao discord!");
        await bot.reply(sender, url);
        await bot.reply(from, `Consulte seu privado. Caso ainda não esteja no meu lindo servidor então aqui está: ${serverUrl}`);
        } catch(err) {
        bot.reply(from, erros_prontos);
        console.error(err);
    }
    }
}
