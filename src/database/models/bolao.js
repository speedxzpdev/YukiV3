const mongoose = require("mongoose");

const scoreSchema = new mongoose.Schema({
  home: {type: Number, default: null},
  away: {type: Number, default: null}
}, {_id: false});

const payoutUserSchema = new mongoose.Schema({
  userLid: {type: String, required: true},
  name: {type: String, default: "Sem nome"},
  stake: {type: Number, default: 0},
  score: {type: scoreSchema, default: () => ({})},
  poolShare: {type: Number, default: 0},
  bonus: {type: Number, default: 0},
  total: {type: Number, default: 0}
}, {_id: false});

const gameSchema = new mongoose.Schema({
  code: {type: String, required: true, unique: true, index: true},
  competition: {type: String, default: "Copa do Mundo"},
  homeTeam: {type: String, required: true},
  awayTeam: {type: String, required: true},
  title: {type: String, required: true},
  startsAt: {type: Date, required: true, index: true},
  bettingOpensAt: {type: Date, required: true, index: true},
  bettingClosesAt: {type: Date, required: true, index: true},
  reminderAt: {type: Date, required: true, index: true},
  resultPromptAt: {type: Date, required: true, index: true},
  status: {
    type: String,
    enum: [
      "scheduled",
      "open",
      "closed",
      "awaiting_result",
      "result_pending_confirmation",
      "paying",
      "paid",
      "refunded",
      "cancelled"
    ],
    default: "scheduled",
    index: true
  },
  source: {type: String, enum: ["manual", "panel", "test"], default: "manual"},
  createdBy: {type: String, required: true, index: true},
  targetGroupIds: {type: [String], default: []},
  testMode: {type: Boolean, default: false, index: true},
  config: {
    minBet: {type: Number, default: 100},
    payoutMode: {type: String, default: "pool_plus_stake_bonus"},
    noWinnerPolicy: {type: String, default: "refund_all"}
  },
  result: {
    homeScore: {type: Number, default: null},
    awayScore: {type: Number, default: null},
    setBy: {type: String, default: null},
    setAt: {type: Date, default: null}
  },
  payoutPreview: {
    generatedAt: {type: Date, default: null},
    pool: {type: Number, default: 0},
    totalBets: {type: Number, default: 0},
    winnerCount: {type: Number, default: 0},
    winnerStake: {type: Number, default: 0},
    totalBonus: {type: Number, default: 0},
    totalPayout: {type: Number, default: 0},
    winners: {type: [payoutUserSchema], default: []},
    refunds: {type: [payoutUserSchema], default: []}
  },
  payoutConfirmedBy: {type: String, default: null},
  payoutStartedAt: {type: Date, default: null},
  paidAt: {type: Date, default: null},
  cancelledAt: {type: Date, default: null},
  cancelReason: {type: String, default: null}
}, {timestamps: true});

gameSchema.index({status: 1, startsAt: 1});
gameSchema.index({status: 1, bettingOpensAt: 1});
gameSchema.index({status: 1, bettingClosesAt: 1});

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
  placedAt: {type: Date, default: Date.now},
  updatedAt: {type: Date, default: Date.now},
  revision: {type: Number, default: 1}
});

betSchema.index({gameId: 1, userLid: 1}, {unique: true});
betSchema.index({gameId: 1, status: 1});

const ledgerSchema = new mongoose.Schema({
  transactionId: {type: String, required: true, unique: true, index: true},
  gameId: {type: mongoose.Schema.Types.ObjectId, required: true, index: true},
  gameCode: {type: String, required: true, index: true},
  userLid: {type: String, required: true, index: true},
  type: {
    type: String,
    enum: ["stake", "stake_adjust", "refund", "payout", "cancel_refund"],
    required: true,
    index: true
  },
  amount: {type: Number, required: true},
  status: {type: String, enum: ["pending", "applied", "failed"], default: "pending", index: true},
  meta: {type: Object, default: {}},
  lockedAt: {type: Date, default: null},
  appliedAt: {type: Date, default: null},
  error: {type: String, default: null},
  createdAt: {type: Date, default: Date.now, index: true}
});

ledgerSchema.index({gameId: 1, userLid: 1, type: 1});

const deliverySchema = new mongoose.Schema({
  dedupeKey: {type: String, required: true, unique: true, index: true},
  gameId: {type: mongoose.Schema.Types.ObjectId, default: null, index: true},
  gameCode: {type: String, default: null, index: true},
  targetId: {type: String, required: true, index: true},
  kind: {
    type: String,
    enum: ["owner_daily", "owner_review", "open", "reminder", "closed", "result_prompt", "paid", "refunded"],
    required: true,
    index: true
  },
  status: {type: String, enum: ["pending", "success", "failed"], default: "pending", index: true},
  attempts: {type: Number, default: 0},
  lastError: {type: String, default: null},
  lockedAt: {type: Date, default: null},
  sentAt: {type: Date, default: null},
  messageId: {type: String, default: null},
  createdAt: {type: Date, default: Date.now, index: true},
  updatedAt: {type: Date, default: Date.now}
});

deliverySchema.index({gameId: 1, kind: 1, targetId: 1});

const bolaoGames = mongoose.model("bolaoGame", gameSchema);
const bolaoBets = mongoose.model("bolaoBet", betSchema);
const bolaoLedgers = mongoose.model("bolaoLedger", ledgerSchema);
const bolaoDeliveries = mongoose.model("bolaoDelivery", deliverySchema);

module.exports = {
  bolaoBets,
  bolaoDeliveries,
  bolaoGames,
  bolaoLedgers
};
