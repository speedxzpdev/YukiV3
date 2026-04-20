const axios = require('axios');

module.exports = async (req, res) => {
    try {
        const sender = req?.query?.state;
        const code = req?.query?.code;

        if(!sender || !code) {
            res.status(400).json({error: "Parâmetros faltando."});
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
        })
    } catch (err) {
        
    }
}