const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  code: {type: String, required: true, unique: true, index: true},
  title: {type: String, required: true},
  competition: {type: String, default: "Copa do Mundo"},
  homeTeam: {type: String, required: true},
  awayTeam: {type: String, required: true},
  startsAt: {type: Date, required: true, index: true},
  closesAt: {type: Date, required: true, index: true},
  status: {
    type: String,
    enum: ["open", "closed", "result_preview", "paid", "refunded", "cancelled"],
    default: "open",
    index: true
  },
  createdBy: {type: String, required: true, index: true},
  groupId: {type: String, default: null, index: true},
  testMode: {type: Boolean, default: false, index: true},
  minBet: {type: Number, default: 100},
  result: {
    homeScore: {type: Number, default: null},
    awayScore: {type: Number, default: null},
    setBy: {type: String, default: null},
    setAt: {type: Date, default: null}
  },
  payoutPreview: {
    pool: {type: Number, default: 0},
    totalBets: {type: Number, default: 0},
    winnerCount: {type: Number, default: 0},
    totalPayout: {type: Number, default: 0},
    winners: {type: [Object], default: []},
    refunds: {type: [Object], default: []},
    generatedAt: {type: Date, default: null}
  },
  paidAt: {type: Date, default: null},
  cancelledAt: {type: Date, default: null},
  cancelReason: {type: String, default: null}
}, {timestamps: true});

gameSchema.index({status: 1, startsAt: 1});

const betSchema = new mongoose.Schema({
  gameId: {type: mongoose.Schema.Types.ObjectId, required: true, index: true},
  gameCode: {type: String, required: true, index: true},
  userLid: {type: String, required: true, index: true},
  name: {type: String, default: "Sem nome"},
  groupId: {type: String, default: null, index: true},
  homeScore: {type: Number, required: true},
  awayScore: {type: Number, required: true},
  stake: {type: Number, required: true},
  status: {
    type: String,
    enum: ["active", "paid", "lost", "refunded", "cancelled"],
    default: "active",
    index: true
  },
  paidAmount: {type: Number, default: 0},
  revision: {type: Number, default: 0},
  placedAt: {type: Date, default: Date.now},
  updatedAt: {type: Date, default: Date.now}
});

betSchema.index({gameId: 1, userLid: 1}, {unique: true});
betSchema.index({gameId: 1, status: 1});

const ledgerSchema = new mongoose.Schema({
  transactionId: {type: String, required: true, unique: true, index: true},
  gameId: {type: mongoose.Schema.Types.ObjectId, required: true, index: true},
  gameCode: {type: String, required: true, index: true},
  userLid: {type: String, required: true, index: true},
  type: {type: String, required: true, index: true},
  amount: {type: Number, required: true},
  status: {type: String, enum: ["applied", "failed"], default: "applied", index: true},
  meta: {type: Object, default: {}},
  createdAt: {type: Date, default: Date.now, index: true}
});

const bolaoGames = mongoose.models.bolaoGame || mongoose.model("bolaoGame", gameSchema);
const bolaoBets = mongoose.models.bolaoBet || mongoose.model("bolaoBet", betSchema);
const bolaoLedgers = mongoose.models.bolaoLedger || mongoose.model("bolaoLedger", ledgerSchema);

module.exports = {
  bolaoBets,
  bolaoGames,
  bolaoLedgers
};
