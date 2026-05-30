const mongoose = require("mongoose");

let connectPromise = null;
let eventsRegistered = false;

function registerMongoEvents() {
  if (eventsRegistered) return;
  eventsRegistered = true;

  mongoose.connection.on("connected", () => {
    console.log("[mongo] conectado");
  });

  mongoose.connection.on("disconnected", () => {
    console.error("[mongo] desconectado; o driver vai tentar reconectar pelo pool");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[mongo] reconectado");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[mongo] erro na conexao:", err);
  });
}

async function connectDB() {
  registerMongoEvents();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = mongoose
    .connect(process.env.URIDB, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 2),
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000)
    })
    .then(() => {
      console.log("mongoDB Conectado!");
      connectPromise = null;
      return mongoose.connection;
    })
    .catch((err) => {
      connectPromise = null;
      throw err;
    });

  return connectPromise;
}

module.exports = connectDB;
