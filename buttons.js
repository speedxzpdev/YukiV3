import { fs } = require('fs')
const { axios } require("axios");
const {
  proto,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  generateMessageID
} = require("whaileys");

async function urlToBuffer(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer"
  });
  return Buffer.from(response.data);
}

const atraso = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))};

const botoes = true;

const sendButton = async ({
  from, dados, wonder, buttons = [], msg = {}, mentions = []
}) => {
  try {
    if (botoes) {
      let midia;
      const but = []
      for (const i of buttons) {
        if (i.type == `copy_url`) but.push({
          name: "cta_url", buttonParamsJson: JSON.stringify({
            display_text: i.text, url: i.url, merchant_url: i.url
          })})
        if (i.type == `copy_text`) but.push({
          name: "cta_copy", buttonParamsJson: JSON.stringify({
            display_text: i.text, copy_code: i.url
          })})
        if (i.type == `call`) but.push({
          name: "cta_call", buttonParamsJson: JSON.stringify({
            display_text: i.text, id: i.url
          })})
        if (i.type == `cmd`) but.push({
          name: "quick_reply", buttonParamsJson: JSON.stringify({
            display_text: i.text, id: i.command, disabled: false
          })})
        if (i.type == `list` || i.type == `lista`) {
          const caixa = []
          for (const a of i.rowId) {
            const lista = []
            for (const b of a.options) {
              lista.push({
                header: b?.name || ``, title: b?.title || ``, description: b?.body, id: b?.command || ``, disabled: false
              })
            }
            caixa.push({
              title: a?.title || ``, highlight_label: a?.body || ``, rows: lista
            })
          }
          but.push({
            name: "single_select", buttonParamsJson: JSON.stringify({
              title: i.title, sections: caixa
            })})
        }
      }
      if (dados?.image) {
        if (typeof dados.image === "string") {
          dados.image = await urlToBuffer(dados.image);
        }
        midia = await prepareWAMessageMedia( {
          image: dados?.image
        }, {
          upload: wonder.waUploadToServer
        })
      } else if (dados?.video) {
        if (typeof dados.video === "string") {
          dados.video = await urlToBuffer(dados.video);
        }
        midia = await prepareWAMessageMedia( {
          video: dados?.video
        }, {
          upload: wonder.waUploadToServer
        })
      } else {
        midia = undefined
      }
      const vom = {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: dados?.image ? {
                hasMediaAttachment: false,
                imageMessage: midia.imageMessage
              }: dados?.video ? {
                hasMediaAttachment: false,
                videoMessage: midia.videoMessage
              }: undefined,
              body: {
                text: dados?.caption ? dados?.caption: dados?.text
              },
              footer: {
                text: dados?.footer
              },
              contextInfo: {
                participant: msg ? msg?.key?.id: ``,
                mentionedJid: mentions,
                quotedMessage: msg?.message,
                forwardingScore: dados?.contextInfo?.forwardingScore || undefined,
                isForwarded: dados?.contextInfo?.isForwarded || undefined,
                forwardedNewsletterMessageInfo: dados?.contextInfo?.forwardedNewsletterMessageInfo || undefined
              },
              nativeFlowMessage: {
                messageVersion: 1,
                buttons: but,
                messageParamsJson: ""
              },
            }
          }
        }
      }
      const gwafc = generateWAMessageFromContent("0", vom, {
        userJid: wonder.user?.id
      })
      wonder.relayMessage(from, gwafc.message, {
        messageId: generateMessageID(wonder.user?.id)})
    } else {
      return wonder.sendMessage(from, dados, msg ? {
        quoted: msg
      }: {})
    }
  } catch(e) {
    console.log(e)}
}

const sendConfigButton = (lista) => {
  but = []
  for (i of lista) {
    but.push({
      buttonId: i.command,
      buttonText: {
        displayText: i.text,
      }
    })
  }
  return but
}

const EnvButton = async(from, dados, wonder, buttons, msg) => {
  try {
    isVid = dados.length >= 4 && dados[3]
    isImg = dados.length >= 3
    isFt = dados.length >= 2
    menc = []
    for (i of dados[0].split(" ")) {
      if (i.includes("@")) menc.push(identArroba(i))
    }
    if (botoes) {
      if (isVid) return wonder.sendMessage(from, {
        video: {
          url: dados[2]}, caption: dados[0], footer: dados[1], mentions: menc, buttons: sendConfigButton(buttons), viewOnce: true, headerType: 6
      }, {
        quoted: msg
      })
      if (isImg) return wonder.sendMessage(from, {
        image: {
          url: dados[2]}, caption: dados[0], footer: dados[1], mentions: menc, buttons: sendConfigButton(buttons), viewOnce: true, headerType: 6
      }, {
        quoted: msg
      })
      return wonder.sendMessage(from, {
        text: dados[0], footer: isFt ? dados[1]: undefined, contextInfo: {
          mentionedJid: menc
        }, buttons: sendConfigButton(buttons), viewOnce: true, headerType: 6
      }, {
        quoted: msg
      })
    } else {
      if (isVid) return wonder.sendMessage(from, {
        video: {
          url: dados[2]}, caption: dados[0], footer: dados[1], mentions: menc
      }, {
        quoted: msg
      })
      if (isImg) return wonder.sendMessage(from, {
        image: {
          url: dados[2]}, caption: dados[0], footer: dados[1], mentions: menc
      }, {
        quoted: msg
      })
      return wonder.sendMessage(from, {
        text: dados[0], footer: isFt ? dados[1]: undefined, mentions: menc
      }, {
        quoted: msg
      })
    }
  } catch(e) {
    console.log(e)}
}

const sendRoulette = async(from, wonder, dados) => {
  try {
    if (botoes) {
      let cards = []
      while (cards.length < dados.length) {
        i = dados[cards.length]
        if (i?.image) {
          let imageBuffer = await fetch(i.image.url).then(res => res.arrayBuffer());
          let imageBufferData = Buffer.from(imageBuffer);
          const imageinfo = await prepareWAMessageMedia( {
            image: imageBufferData
          }, {
            upload: wonder.waUploadToServer
          })
          cards.push({
            header: {
              hasMediaAttachment: true,
              imageMessage: imageinfo.imageMessage
            }, headerType: 'IMAGE',
            body: {
              text: i?.caption || ""
            },
            footer: {
              text: i?.footer || ""
            },
            nativeFlowMessage: {
              buttons: []}
          })
        } else if (i?.video) {
          let videoBuffer = await fetch(i.video.url).then(res => res.arrayBuffer());
          let videoBufferData = Buffer.from(videoBuffer);
          const videoinfo = await prepareWAMessageMedia( {
            video: videoBufferData
          }, {
            upload: wonder.waUploadToServer
          })
          cards.push({
            header: {
              hasMediaAttachment: true,
              videoMessage: videoinfo.videoMessage
            }, headerType: 'IMAGE',
            body: {
              text: i?.caption || ""
            },
            footer: {
              text: i?.footer || ""
            },
            nativeFlowMessage: {
              buttons: []}
          })
        }
      }
      return wonder.relayMessage(from, {
        interactiveMessage: {
          carouselMessage: {
            cards: cards
          }
        }
      }, {})
    } else {
      for (i of dados) {
        if (i?.image) {
          await atraso(1000)
          wonder.sendMessage(from, {
            image: i.image, caption: i?.caption || ``
          })
        } else if (i?.video) {
          await atraso(2500)
          wonder.sendMessage(from, {
            video: i.video, caption: i?.caption || ``
          })
        }
      }
    }
  } catch(e) {
    console.log(e)}
}

const sendRouletteButton = async ({
  from, dados, wonder, sender, butao, msg
}) => {
  but = []
  for (i of butao) {
    if (i.type == `copy_url`) but.push({
      name: "cta_url", buttonParamsJson: JSON.stringify({
        display_text: i.text, url: i.url, merchant_url: i.url
      })})
    if (i.type == `copy_text`) but.push({
      name: "cta_copy", buttonParamsJson: JSON.stringify({
        display_text: i.text, copy_code: i.url
      })})
    if (i.type == `call`) but.push({
      name: "cta_call", buttonParamsJson: JSON.stringify({
        display_text: i.text, id: i.url
      })})
    if (i.type == `cmd`) but.push({
      name: "quick_reply", buttonParamsJson: JSON.stringify({
        display_text: i.text, id: i.command, disabled: false
      })})
    if (i.type == `list` || i.type == `lista`) {
      caixa = []
      for (a of i.rowId) {
        lista = []
        for (b of a.options) {
          lista.push({
            header: b?.name || ``, title: b?.title || ``, description: b?.body, id: b?.command || ``, disabled: false
          })
        }
        caixa.push({
          title: a?.title || ``, highlight_label: a?.body || ``, rows: lista
        })
      }
      but.push({
        name: "single_select", buttonParamsJson: JSON.stringify({
          title: i.title, sections: caixa
        })})
    }
  }
  cardImage = {
    header: proto.Message.InteractiveMessage.Header.create({
      ...(await prepareWAMessageMedia( {
        image: dados?.image
      }, {
        upload: wonder.waUploadToServer
      })),
      hasMediaAttachment: true,
      title: dados?.caption + (dados?.footer ? `\n> ` + dados?.footer: ``)
    }),
    nativeFlowMessage: {
      buttons: but,
      messageParamsJson: ""
    }
  }
  let blackzin_buttons = generateWAMessageFromContent(from, {
    interactiveMessage: {
      contextInfo: {
        participant: sender,
        mentionedJid: dados?.mentions,
        quotedMessage: msg?.message
      },
      carouselMessage: {
        cards: [cardImage],
        messageVersion: 1,
      }
    }
  }, {})
  return wonder.relayMessage(from, blackzin_buttons.message, {
    messageId: blackzin_buttons.key.id
  })
}

const sendCard = async ({
  from, wonder, caption = "", footer = "", data, mentions = undefined, msg
}) => {
  try {
    let cards = [];

    for (let cardData of data) {
      let but = [];

      if (cardData.buttons && cardData.buttons.length > 0) {
        for (let btn of cardData.buttons) {
          if (btn.type === "cmd") {
            but.push({
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: btn.text,
                id: btn.command,
                disabled: false
              })
            });
          } else if (btn.type === "copy_url") {
            but.push({
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: btn.text,
                url: btn.url,
                merchant_url: btn.url
              })
            });
          } else if (btn.type === "copy_text") {
            but.push({
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: btn.text,
                copy_code: btn.url
              })
            });
          } else if (btn.type === "call") {
            but.push({
              name: "cta_call",
              buttonParamsJson: JSON.stringify({
                display_text: btn.text,
                id: btn.url
              })
            });
          } else if (btn.type === "list" || btn.type === "lista") {
            let caixa = [];
            for (let a of btn.rowId) {
              let lista = [];
              for (let b of a.options) {
                lista.push({
                  header: b?.name || ``,
                  title: b?.title || ``,
                  description: b?.body,
                  id: b?.command || ``,
                  disabled: false
                });
              }
              caixa.push({
                title: a?.title || ``,
                highlight_label: a?.body || ``,
                rows: lista
              });
            }
            but.push({
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: btn.title,
                sections: caixa
              })
            });
          }
        }
      }

      let imageMessage = null;
      if (cardData.image) {
        if (typeof cardData.image === "string") {
          cardData.image = await urlToBuffer(cardData.image);
        }

        let midia = await prepareWAMessageMedia(
          {
            image: cardData.image
          },
          {
            upload: wonder.waUploadToServer
          }
        );
        imageMessage = midia.imageMessage;
      }

      let videoMessage = null;
      if (cardData.video) {
        if (typeof cardData.video === "string") {
          cardData.video = await urlToBuffer(cardData.video);
        }

        let midia = await prepareWAMessageMedia(
          {
            video: cardData.video
          },
          {
            upload: wonder.waUploadToServer
          }
        );
        videoMessage = midia.videoMessage;
      }

      let card = {
        nativeFlowMessage: {
          buttons: but,
          messageParamsJson: ""
        }
      };

      if (imageMessage) {
        card.header = {
          hasMediaAttachment: true,
          imageMessage,
          title: cardData.caption || ""
        };
      } else if (videoMessage) {
        card.header = {
          hasMediaAttachment: true,
          videoMessage,
          title: cardData.caption || ""
        };
      }

      if (cardData.body || cardData.text) {
        card.body = {
          text: cardData.body || cardData.text || ""
        };
      }

      if (cardData.footer) {
        card.footer = {
          text: cardData.footer
        };
      }

      cards.push(card);
    }

    const contextInfo = {};

    if (mentions && mentions?.length) {
      contextInfo.mentionedJid = mentions;
    }

    let message = generateWAMessageFromContent(from, {
      interactiveMessage: {
        body: {
          text: caption
        },
        footer: {
          text: footer
        },
        ...(Object.keys(contextInfo).length && {
          contextInfo
        }),
        carouselMessage: {
          cards,
          messageVersion: 1
        }
      }
    }, {});

    return wonder.relayMessage(from, message.message, {
      messageId: generateMessageID(wonder.user?.id)
    });
  } catch (e) {
    console.log(e);
  }
};

const sendList = async({
  from, dados, wonder, sender, title, list, msg
}) => {
  try {
    if (botoes) {
      const caixa = []
      for (const a of list) {
        const hehe = []
        for (const b of a.options) {
          hehe.push({
            header: b?.name || ``, title: b?.title || ``, description: b?.body, id: b?.command || ``, disabled: false
          })
        }
        caixa.push({
          title: a?.title || ``, highlight_label: a?.body || ``, rows: hehe
        })
      }
      const but = [{
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: title, sections: caixa
        })}]
      if (dados?.text) return wonder.relayMessage(from, {
        interactiveMessage: {
          body: {
            text: dados?.text || ``
          }, footer: {
            text: dados?.footer || ``
          }, contextInfo: {
            participant: sender, mentionedJid: dados?.mentions, quotedMessage: msg ? msg.message: ``, forwardingScore: dados?.contextInfo?.forwardingScore || 0, isForwarded: dados?.contextInfo?.isForwarded || false, forwardedNewsletterMessageInfo: {
              newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``, newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
            }}, nativeFlowMessage: {
            buttons: but, messageParamsJson: ""
          }}}, {})
      if (dados?.image) {
        const img = await prepareWAMessageMedia( {
          image: dados?.image
        }, {
          upload: wonder.waUploadToServer
        })
        return wonder.relayMessage(from, {
          interactiveMessage: {
            header: {
              hasMediaAttachment: true, imageMessage: img.imageMessage
            }, headerType: `IMAGE`, body: {
              text: dados?.caption || ``
            }, footer: {
              text: dados?.footer || ``
            }, contextInfo: {
              participant: msg.key.participant || msg.key.remoteJid, mentionedJid: dados?.mentions, quotedMessage: msg ? msg.message: ``, forwardingScore: dados?.contextInfo?.forwardingScore || 0, isForwarded: dados?.contextInfo?.isForwarded || false, forwardedNewsletterMessageInfo: {
                newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``, newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
              }}, nativeFlowMessage: {
              buttons: but, messageParamsJson: ""
            }}}, {})
      }
      const vid = await prepareWAMessageMedia( {
        video: dados?.video
      }, {
        upload: wonder.waUploadToServer
      })
      return wonder.relayMessage(from, {
        interactiveMessage: {
          header: {
            hasMediaAttachment: true, videoMessage: vid.videoMessage
          }, headerType: `IMAGE`, body: {
            text: dados?.caption || ``
          }, footer: {
            text: dados?.footer || ``
          }, contextInfo: {
            participant: sender, mentionedJid: dados?.mentions, quotedMessage: msg ? msg.message: ``, forwardingScore: dados?.contextInfo?.forwardingScore || 0, isForwarded: dados?.contextInfo?.isForwarded || false, forwardedNewsletterMessageInfo: {
              newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``, newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
            }}, nativeFlowMessage: {
            buttons: but, messageParamsJson: ""
          }}}, {})
    } else {
      if (dados?.text) return wonder.sendMessage(from, {
        text: dados?.text, mentions: dados?.mentions, contextInfo: {
          forwardingScore: dados?.contextInfo?.forwardingScore || 0, isForwarded: dados?.contextInfo?.isForwarded || false, forwardedNewsletterMessageInfo: {
            newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``, newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
          }}}, {
        quoted: msg
      })
      if (dados?.image) return wonder.sendMessage(from, {
        image: dados?.image, caption: dados?.caption, mentions: dados?.mentions, contextInfo: {
          forwardingScore: dados?.contextInfo?.forwardingScore || 0, isForwarded: dados?.contextInfo?.isForwarded || false, forwardedNewsletterMessageInfo: {
            newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``, newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
          }}}, {
        quoted: msg
      })
      return wonder.sendMessage(from, {
        video: dados?.video, caption: dados?.caption, mentions: dados?.mentions, contextInfo: {
          forwardingScore: dados?.contextInfo?.forwardingScore || 0, isForwarded: dados?.contextInfo?.isForwarded || false, forwardedNewsletterMessageInfo: {
            newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``, newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
          }}}, {
        quoted: msg
      })
    }
  } catch(e) {
    console.log(e)}
}

const sendListIOS = async(from, dados, wonder, sender, title, lista, msg) => {
  try {
    if (botoes) {
      caixa = []
      for (a of lista) {
        for (b = 0; b < a.options.length; b++) {
          c = a.options[b]
          caixa.push({
            title: b == 0 ? a?.title || ``: ``,
            highlight_label: a?.body ? a.body: c?.high ? c.high: ``,
            rows: [{
              header: c?.name || ``,
              title: c?.title,
              description: c?.body,
              id: c?.command
            }]
          })
        }
      }
      if (dados?.image) {
        img = await prepareWAMessageMedia( {
          image: dados?.image
        }, {
          upload: wonder.waUploadToServer
        })}
      if (dados?.video) {
        vid = await prepareWAMessageMedia( {
          video: dados?.video
        }, {
          upload: wonder.waUploadToServer
        })}
      return wonder.relayMessage(from, {
        interactiveMessage: {
          header: dados?.image ? {
            title: dados?.contextInfo?.externalAdReply?.title || ``,
            subtitle: dados?.contextInfo?.externalAdReply?.body || ``,
            hasMediaAttachment: true,
            imageMessage: img.imageMessage
          }: dados?.video ? {
            title: dados?.contextInfo?.externalAdReply?.title || ``,
            subtitle: dados?.contextInfo?.externalAdReply?.body || ``,
            hasMediaAttachment: true,
            videoMessage: vid.videoMessage
          }: ``,
          body: {
            text: dados?.text ? dados.text: dados.caption
          },
          footer: {
            text: dados?.footer || ``
          },
          contextInfo: {
            participant: sender,
            mentionedJid: dados?.mentions,
            quotedMessage: msg ? msg.message: ``,
            forwardingScore: dados?.contextInfo?.forwardingScore || 0,
            isForwarded: dados?.contextInfo?.isForwarded || false,
            forwardedNewsletterMessageInfo: {
              newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``,
              newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
            }
          },
          nativeFlowMessage: {
            buttons: [{
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: title, sections: caixa
              })
            }],
            messageParamsJson: ""
          }
        }
      }, {})
    } else {
      if (dados?.text) return wonder.sendMessage(from, {
        text: dados?.text, mentions: dados?.mentions, contextInfo: {
          forwardingScore: dados?.contextInfo?.forwardingScore || 0, isForwarded: dados?.contextInfo?.isForwarded || false, forwardedNewsletterMessageInfo: {
            newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``, newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
          }}}, {
        quoted: msg
      })
      if (dados?.image) return wonder.sendMessage(from, {
        image: dados?.image, caption: dados?.caption, mentions: dados?.mentions, contextInfo: {
          forwardingScore: dados?.contextInfo?.forwardingScore || 0, isForwarded: dados?.contextInfo?.isForwarded || false, forwardedNewsletterMessageInfo: {
            newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``, newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
          }}}, {
        quoted: msg
      })
      return wonder.sendMessage(from, {
        video: dados?.video, caption: dados?.caption, mentions: dados?.mentions, contextInfo: {
          forwardingScore: dados?.contextInfo?.forwardingScore || 0, isForwarded: dados?.contextInfo?.isForwarded || false, forwardedNewsletterMessageInfo: {
            newsletterJid: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid || ``, newsletterName: dados?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName || ``
          }}}, {
        quoted: msg
      })
    }
  } catch(e) {
    console.log(e)}
}


module.exports {
  sendRouletteButton,
  sendButton,
  EnvButton,
  sendRoulette,
  sendCard,
  sendList
}