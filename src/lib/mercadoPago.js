const { MercadoPagoConfig, Payment } = require("mercadopago");
require("dotenv").config();

const clientMp = new MercadoPagoConfig({
  accessToken: process.env.APIKEY_MERCADOPAGO
});

const payment = new Payment(clientMp);

module.exports = {
  clientMp,
  payment
};