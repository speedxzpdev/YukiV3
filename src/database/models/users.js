const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
  userLid: {type: String, required: true},
  name: {type: String, required: true},
  bio: {type: String, default: "Olá, amo a Yuki!"},
  isVip: {type: Boolean, default: false},
  vencimentoVip: {type: Date, default: new Date()},
  registro: {type: Date, default: new Date()},
  casal: {
    parceiro: {type: String, default: null},
    pedido: {type: Date, default: null},
    filhos: [String]
  },
  prefixo: {type: Boolean, default: true},
  daily: {type: Date, default: null},
  waifus: [Object],
  conquistas: [Object],
  dinheiro: {type: Number, default: 100},
  donwloads: {type: Number, default: 0},
  figurinhas: {type: Number, default: 0},
  cmdCount: {type: Number, default: 0}
})

const users = mongoose.model("User", userSchema);

module.exports = {
  users
}