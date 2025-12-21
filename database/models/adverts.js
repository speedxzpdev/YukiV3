const mongoose = require("mongoose");


const schema = new mongoose.Schema({
  grupo: {type: String, required: true},
  userLid: {type: String, required: true},
  adverts: {type: Number, default: 0}
});

const advertidos = mongoose.model("adv", schema)