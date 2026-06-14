const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  groupId: {type: String, required: true, index: true},
  grupoName: {type: String, required: true},
  ownerId: {type: String, required: true},
  aluguel: {type: Date, default: Date.now},
  configs: {
    events: {type: Boolean, default: true},
    prefixo: {type: String, default: "/"},
    welcome: {type: Boolean, default: true},
    antlink: {type: Boolean, default: false},
    cmdFun: {type: Boolean, default: false},
    cmdAdulto: {type: Boolean, default: false},
    bolao: {type: Boolean, default: true}
  },
  lang: {type: String, default: "pt-br"},
  autoReply: {type: Boolean, default: true},
  autoDownload: {type: Boolean, default: true},
  cmdUsados: {type: Number, default: 0},
  afkList: [String],
  antiTotag: {type: Boolean, default: false},
  multiprefixo: {type: Boolean, default: false}
  
  
  
});

schema.index({ aluguel: 1 });
schema.index({ cmdUsados: -1 });

const grupos = mongoose.model("grupos", schema);

module.exports = {
  grupos
  
}


