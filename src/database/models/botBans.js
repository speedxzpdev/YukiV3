const mongoose = require("mongoose");

const botBanSchema = new mongoose.Schema({
  userLid: {type: String, required: true, unique: true, index: true},
  active: {type: Boolean, default: true, index: true},
  reason: {type: String, default: "banido da Yuki"},
  bannedBy: {type: String, default: null},
  unbannedBy: {type: String, default: null},
  bannedAt: {type: Date, default: Date.now},
  unbannedAt: {type: Date, default: null}
}, {timestamps: true});

const botBans = mongoose.models.botBan || mongoose.model("botBan", botBanSchema);

module.exports = {
  botBans
};
