const { users } = require("../../database/models/users.js");




module.exports = {
   name: "ranklevel",
   async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {

        const usersAll = await users.find().sort({level: -1}).limit(10);

        const rank = usersAll.map((user, index) => {
            return `${index + 1}º @${user.userLid.split("@")[0]}
*level*: ${user.level}
*xp:* ${user.xp}
`
        });

        await sock.sendMessage(from, { text: `*Rank de levels!*\n${rank.join("\n\n")}`, mentions: usersAll.map((i => i.userLid))}, {quoted: msg});
    }
    catch(err) {
        console.error(err);
        await bot.reply(from, erros_prontos);
    }
   }

}