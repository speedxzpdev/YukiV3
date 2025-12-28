const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userLid: {type: String, require: true},
  data: {type: Date, default: new Date},
  desc: {type: String, default: "Oi!"}
  
});

const donos = mongoose.model("Dono", schema);

module.exports = {
  donos
}