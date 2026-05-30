const mongoose = require("mongoose");


const model = new mongoose.Schema({
  grupo: {type: String, required: true},
  userLid: {type: String, required: true},
  tentativasMsg: {type: Number, default: 0}
});

model.index({ userLid: 1, grupo: 1 });

const mutados = mongoose.model('mutado', model);

module.exports = {
  mutados
}
