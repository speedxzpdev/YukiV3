const { text } = require('express');
const { number_bot } = require('../../config');
const { execute } = require('./beijo');
const { jidToSignalSenderKeyName } = require('whaileys');


module.exports = {
    name: 'abraco',
    categoria: 'diversao',
    async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {

        try {
          
            const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  || msg.message?.extendedTextMessage?.contextInfo?.participant;

            const alvo = mention.split('@')[0];

            const autor = sender.split('@')[0];
            
            const msgbeijo = [`Ohhm, @${autor} abraçou @${alvo} que fofinho!`, `Que bonitinho! @${autor} deu um abraço no @${alvo}`];

            const msgRandom = msgbeijo[Math.floor(Math.random() * msgbeijo.length)];

            const gifsLink = ['https://files.catbox.moe/hh61p6.mp4', 'https://files.catbox.moe/pn6lbn.mp4'];

            const gifsRandom = gifsLink[Math.floor(Math.random() * gifsLink.length)];

            await sock.sendMessage(from, {video: {url: gifsRandom}, caption: msgRandom, gifPlayback: true, mentions: [mention, sender]}, {quoted: msg});

        }
        catch(err) {
            sock.sendMessage(from, { text: erros_prontos}, { quoted: msg });
            console.error(err);
        }

    }

}