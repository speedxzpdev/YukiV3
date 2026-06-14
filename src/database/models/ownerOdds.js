const mongoose = require("mongoose");

const ownerOddSchema = new mongoose.Schema({
  userLid: {type: String, required: true, unique: true, index: true},
  active: {type: Boolean, default: true, index: true},
  updatedBy: {type: String, default: null}
}, {timestamps: true});

const ownerOdds = mongoose.models.ownerOdd || mongoose.model("ownerOdd", ownerOddSchema);

module.exports = {
  ownerOdds
};
