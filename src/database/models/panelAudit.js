const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  actorLid: {type: String, required: true, index: true},
  actorRole: {type: String, required: true},
  groupId: {type: String, default: null, index: true},
  targetLid: {type: String, default: null},
  action: {type: String, required: true, index: true},
  status: {type: String, required: true, enum: ["success", "failed"]},
  message: {type: String, default: null},
  details: {type: Object, default: {}},
  createdAt: {type: Date, default: Date.now, index: true}
});

const panelAudits = mongoose.model("panelAudit", schema);

module.exports = {
  panelAudits
};
