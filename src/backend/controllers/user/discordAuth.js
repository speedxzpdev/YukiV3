const axios = require('axios');
const socket = require("../../../sock.js");
const { clientRedis } = require("../../../lib/redis.js");
const { users } = require("../../../database/models/users.js");


module.exports = async (req, res) => {
    try {
        const sender = req?.query?.state;
        const code = req?.query?.code;

        if(!sender || !code) {
            res.status(400).json({error: "Parâmetros faltando."});
            return
        }

        const user = await clientRedis.hGetAll(sender);

        if(!user.userLid) {
            res.status(404).json({error: "user nao registrado"});
            return
        }



        const token_response = axios.get("https://discord.com/api/oauth2/token", new URLSearchParams({
            client_id: process.env.CLIENT_SHIZUKU,
            client_secret: process.env.CLIENT_SECRET_SHIZUKU,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: process.env.REDIRECT_DISCORD
        }), {
            headers: {
                "Content-type": "application/x-www-form-"
            }
        });

        const token = token_response.data.access_token;

        const user_response = await axios.get("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `Bearer ${user.userLid}`
            }
        });

        await users.updateOne({userLid: user.userLid}, {$set: {discord_id: user_response.data.id, discord_name: user_response.data.global_name}}, {upsert: true});

        try {
            
            const sock = socket.getSock();

            await sock.sendMessage(user.userLid, {text: `A Shizuku acabou de me avisar que você logou sua conta em ${user_response.data.username}!`});

        } catch (error) {
            console.warn("ocorreu um erro ao enviar mensagem\n\n", error);
        }

        res.status(200).json({message: "autentificação feita!"});

    } catch (err) {
        console.error(err);
        res.status(500).json({error: "ocorreu um erro interno."});
    }
}