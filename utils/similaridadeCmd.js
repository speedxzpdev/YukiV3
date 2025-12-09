const stringSimilarity = require("string-similarity");

function similarityCmd(commands, content) {
  
  const matchCMD = stringSimilarity.findBestMatch(content, commands);
  
  const similaridade = (matchCMD.bestMatch.rating * 100).toFixed(2)
  
  let sugest = matchCMD.bestMatch.target

  
  
  const returnSimilarity = {sugest: sugest, similarity: similaridade}
  
  return returnSimilarity
  
  
}

module.exports = similarityCmd