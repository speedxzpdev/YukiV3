const mongoose = require("mongoose");


const schema = new mongoose.Schema({
  alvo: {type: String, required: true},
  pedidor: {type: String, required: true},
  createAt: {
    type: Date,
    default: Date.now,
    expires: 1200
  }
});

const namoros = mongoose.model('Namoro', schema);


module.exports = {
  namoros
}