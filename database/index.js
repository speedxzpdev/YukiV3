require("dotenv").config();
const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.URIDB, {
      serverSelectionTimeoutMS: 5000
    });

    console.log("🟢 MongoDB conectado com sucesso");
  } catch (err) {
    console.error("🔴 Erro ao conectar no MongoDB:");
    console.error(err);
    process.exit(1); // mata o processo se não conectar
  }
}

module.exports = connectDB;
