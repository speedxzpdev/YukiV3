const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, requestPairingCode, baileys, fetchLatestBaileysVersion, Browsers} = require("whaileys");
const P = require("pino");
const path = require("path");
require("dotenv").config();

class SockBot {
    constructor({QRcode}) {
        this.sock = null;
        this.isInit = false
        this.QRcode = QRcode
    }
    async init() {
        const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "/assets/auth"));
  
  //Pega a ultima versao da baileys 
  const { version } = await fetchLatestBaileysVersion();
  
  //sock do bot
    this.sock = makeWASocket({
        version: [2, 3000, 1034740716],
        logger: P({ level: 'silent' }),
        auth: state,
        browser: Browsers.ubuntu('chrome'),
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true,
        printQRInTerminal: this.QRcode
    });

    this.sock.ev.on("creds.update", saveCreds);

    if(!state.creds.registered && (!this.QRcode)) {
        setTimeout(async () => {
        const code = await this.sock.requestPairingCode(process.env.NUMBER);
        console.log("Codigo: ", code);
    }, 2000);

    
    }
     
    this.isInit = true;
    return this.sock

    }


    getSock() {

        if(!this.sock) {
            throw new Error("Sock não inicializado.");
        }

        return this.sock
    }


}

module.exports = new SockBot({QRcode: true});