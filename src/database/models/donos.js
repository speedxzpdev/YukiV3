const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userLid: {type: String, required: true, index: true},
  data: {type: Date, default: Date.now},
  desc: {type: String, default: "Oi!"}
  
});

const donos = mongoose.model("Dono", schema);

module.exports = {
  donos
}
