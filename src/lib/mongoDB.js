const mongoose = require("mongoose");


async function connectDB() {
  await mongoose.connect(process.env.URIDB);
  console.log("mongoDB Conectado!");
}
module.exports = connectDB