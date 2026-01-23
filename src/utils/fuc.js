const permJson = require("../database/permissao.json");


//Classe com diversas funcoes
class YukiBot {
  constructor({sock, msg}) {
    this.sock = sock
    this.msg = msg
  }
  
  //responde a uma mensagem
  async reply(from, text, quoted) {
    const r = await this.sock.sendMessage(from, {text: text}, {quoted: quoted ?? this.msg});
    return r
    
  }
  
  //envia uma mensagem
  async send(from, text) {
    await this.sock.sendMessage(from, {text: text});
  }
  
  //envia uma mensagem de permissao
  async sendNoAdmin(from) {
    const random = permJson[Math.floor(Math.random() * permJson.length)];
    
    await this.sock.sendMessage(from, {text: random}, {quoted: this.msg});
  }
  //verififca se admin ou n
  async isAdmin(from) {
    
    if(!from) return;
    
    const metadata = await this.sock.groupMetadata(from);
    
    const sender = this.msg.key.participant
    
    const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
    
    return admins.includes(sender);
    
  }
  
  //envia uma reação
  async react(from, text, message) {
    await this.sock.sendMessage(from, {react: {text: text, key: message.key ?? this.msg.key}});
  }
  
  async editReply(from, key, text) {
    await this.sock.sendMessage(from, {text: text, edit: key});
  }
}

module.exports = YukiBot