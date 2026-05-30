const mongoose = require("mongoose");


const schema = new mongoose.Schema({
  grupo: {type: String, required: true},
  userLid: {type: String, required: true},
  adv: {type: Number, default: 0}
});

schema.index({ userLid: 1, grupo: 1 });

const advertidos = mongoose.model("adv", schema)

module.exports = {
  advertidos
}
