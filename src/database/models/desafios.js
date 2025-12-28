const mongoose = require("mongoose");

const desafiosSchema = new mongoose.Schema({
  desafiante: {type: String, required: true},
  alvo: {type: String, required: true},
  valor: {type: Number, required: true},
  ctx: {type: String, required: true},
  desafioAt: {type: Date, default: Date.now, index: { expires: 300 }}
});

const desafiosModel = mongoose.model("desafio", desafiosSchema);


module.exports = {
  desafiosModel
}

