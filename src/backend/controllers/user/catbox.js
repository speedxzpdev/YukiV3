const axios = require('axios');
const Form = require('form-data');
const fs = require('fs');

module.exports = async function catbox(req, res) {
const file = req?.file;
    try {
    if (!file) {
        return res.status(400).json({error: "nenhum arquivo enviado"});
    }

    if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({error: "arquivo muito grande, o limite é 10MB"});
    }

    const formData = new Form();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", file.buffer, file.originalname);


        const response = await axios.post("https://catbox.moe/user/api.php",
            formData,
            { headers: { 
                ...formData.getHeaders(),
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            } }
        );

        console.log(response.data);
        
        return res.status(200).json({url: response.data});


    } catch (err) {
        return res.status(500).json({error: "erro interno"});
        console.error(err); 
        
    }
}