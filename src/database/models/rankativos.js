const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userLid: {type: String, required: true},
  cmdUsados: {type: Number, default: 0},
  msg: {type: Number, default: 0},
  from: {type: String, required: true}
});

const rankativos = mongoose.model("rankAtivo", schema);

module.exports = {
  rankativos
}