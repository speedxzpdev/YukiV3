const axios = require("axios");


//Instancia da zero two
const zerotwoApi = axios.create({
  baseURL: "https://zero-two-apis.com.br/api",
  params: {
    apikey: process.env.ZEROTWO_APIKEY
  }
});


module.exports = zerotwoApi