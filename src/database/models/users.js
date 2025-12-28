const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
  userLid: {type: String, required: true},
  bio: {type: String, default: "Olá, amo a Yuki!"},
  registro: {type: Date, default: new Date()},
  casal: {
    parceiro: {type: String, default: null},
    pedido: {type: Date, default: null}
  },
  prefixo: {type: Boolean, default: true},
  daily: {type: Date, default: null},
  dinheiro: {type: Number, default: 100},
  donwloads: {type: Number, default: 0},
  figurinhas: {type: Number, default: 0}
})

const users = mongoose.model("User", userSchema);

module.exports = {
  users
}