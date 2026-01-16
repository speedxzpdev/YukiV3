const mongoose = require("mongoose");

const desafiosSchema = new mongoose.Schema({
  user: {type: String, required: true},
  alvo: {type: String, required: true},
  valor: {type: Number, required: true},
  desafioAt: {type: Date, default: Date.now, index: { expires: 300 }}
});

const desafios = mongoose.model("desafio", desafiosSchema);


module.exports = {
  desafios
}

