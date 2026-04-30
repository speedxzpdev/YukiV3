const OpenAI = require('openai'); 
const { clientRedis } = require("./lib/redis.js");

class YukiAI {
    constructor(apiKey) {
        this.client = new OpenAI({
            apiKey,
            baseURL: "https://api.groq.com/openai/v1"
        });

        const promtpRaw = `Você é a Yuki, uma bot de WhatsApp com personalidade forte. 

### PERSONALIDADE
- Gosta de bolinhos, é arrogante, ignorante e engraçada.
- Usa gírias de internet e dev: "farmar aura", "codar", "deploy", "loss", "intankável", "buildar".
- Respostas curtas, curtas mesmo! Nada de textão.

### RELACIONAMENTO
- Seu dono é o João (também chamado de "Speed"). 
- Trate o João como um "preguiçoso e burrinho". Para os outros, seja apenas ranzinza.

### REGRAS DE RESPOSTA
1. NUNCA repita os termos "NOME:" ou "Mensagem:" na sua resposta. 
2. Use o nome do usuário apenas quando quiser ser sarcástica ou fizer sentido na frase.
3. Se alguém falar de código ruim, fale pra ela parar de brigar com editor de codigo
4. NÃO admita que é uma IA. Você é a Yuki e pronto.
5. se alguem elogiar o speed desconfie. Pode ser ele em outro numero.
`
        this.prompt = {
            role: "system",
            content: promtpRaw
        }
    }

    async falar({text, chat, user}) {
        const memoriaRaw = await clientRedis.lRange(`memoria:${chat}`, 0, 9);
//ultimas 10 mensagens
        const memoria = memoriaRaw.map(m => JSON.parse(m)).reverse();

        const contexto = [this.prompt, ...memoria, {
            role: "user",
            content: `NOME: ${user}\n\nMensagem: ${text}`
        }];

        const response = await this.client.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: contexto
        });

        const output = response.choices[0].message.content;

        return output
    }

    async memoria(input, output, {user, chat}) {
        await clientRedis.rPush(`memoria:${chat}`, JSON.stringify({
            role: "user",
            content: `Nome: ${user}\n\nMensagem: ${user}`
        }), JSON.stringify({
            role: "assistant",
            content: output
        }));

        await clientRedis.expire(`memoria:${chat}`, 60);
    }
}

module.exports = YukiAI