/*
  DECIDIMOS FAZER ESSA GAMBIARRA PARA CONECTAR AO MONGO, POIS O MONGODB SE DESCONECTA DE VEZ EM QUANDO, ENTÃO PARA EVITAR QUE O SERVIDOR FIQUE CAINDO, DECIDIMOS COLOCAR UM SETTIMEOUT PARA REINICIAR O SERVIDOR CASO O MONGO DESCONECTE, E TAMBÉM COLOCAMOS UM LOG PARA SABER QUANDO O MONGO DESCONECTA E QUANDO ELE RECONECTA. 
  NO ENTANTO, ESSA NÃO É A MELHOR SOLUÇÃO, POIS O SERVIDOR FICA REINICIANDO SEM NECESSIDADE, O IDEAL SERIA OTIMIZAR AS QUANTIDADE DE QUERY MAS  O TEMPO ESTÁ APERTADO E ESSA SOLUÇÃO FUNCIONA, ENTÃO DECIDIMOS DEIXAR ASSIM POR ENQUANTO, MAS FUTURAMENTE VAMOS OTIMIZAR ISSO PARA EVITAR QUE O SERVIDOR FIQUE REINICIANDO SEM NECESSIDADE.
*/




const mongoose = require("mongoose");


async function connectDB() {
    try {
  await mongoose.connect(process.env.URIDB);
  console.log("mongoDB Conectado!"); 

} 

  catch (error) { 

    console.error("erro ao conectaar", error);

    setTimeout(() => {      process.exit(1);
    }, 5000);
    
    }
}

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB desconectado!");
  setTimeout(() => {    process.exit(1);
  }, 5000);

});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconectado!");
});

mongoose.connection.on("error", (err) => {
  console.error("Erro na conexão Mongo:", err);
});

module.exports = connectDB