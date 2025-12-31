const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  groupId: {type: String, required: true},
  grupoName: {type: String, required: true},
  aluguel: {type: Date, default: null},
  configs: {
    events: {type: Boolean, default: true},
    prefixo: {type: String, default: "/"},
    welcome: {type: Boolean, default: true},
    antlink: {type: Boolean, default: false},
    cmdFun: {type: Boolean, default: false},
    cmdAdulto: {type: Boolean, default: false}
  },
  lang: {type: String, default: "pt-br"},
  autoReply: {type: Boolean, default: false},
  cmdUsados: {type: Number, default: 0}
  
  
  
});

const grupos = mongoose.model("grupos", schema);

module.exports = {
  grupos
  
}


