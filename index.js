const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const http = require("http");

const PORT = process.env.PORT || 10000;
const PHONE_NUMBER = process.env.PHONE_NUMBER;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Matupa DML Bot is running!");
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  if (!state.creds.registered && PHONE_NUMBER) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(
          PHONE_NUMBER.replace(/\D/g, "")
        );
        console.log("WHATSAPP PAIRING CODE:", code);
      } catch (error) {
        console.log("Pairing code error:", error.message);
      }
    }, 3000);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    console.log("Connection:", connection);

    if (connection === "open") {
      console.log("Matupa DML Bot imeunganishwa WhatsApp! ✅");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) setTimeout(startBot, 3000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg?.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const command = text.trim().toLowerCase();
    const jid = msg.key.remoteJid;

    if (command === ".ping") {
      await sock.sendMessage(jid, { text: "🏓 Pong! Bot inafanya kazi." });
    }

    if (command === ".hi" || command === "hi") {
      await sock.sendMessage(jid, {
        text: "Habari 👋 Mimi ni Matupa DML Bot."
      });
    }

    if (command === ".menu") {
      await sock.sendMessage(jid, {
        text: `🤖 *MATUPA DML BOT*

📋 *COMMANDS*
• .ping
• .hi
• .menu
• .time
• .date
• .owner
• .getpp
• .ph
• .bass
• .treble`
      });
    }

    if (command === ".time") {
      const time = new Date().toLocaleTimeString("sw-TZ");
      await sock.sendMessage(jid, { text: `🕒 ${time}` });
    }

    if (command === ".date") {
      const date = new Date().toLocaleDateString("sw-TZ");
      await sock.sendMessage(jid, { text: `📅 ${date}` });
    }

    if (command === ".owner") {
      await sock.sendMessage(jid, { text: "👤 Owner: Matupa DML" });
    }

    if (command === ".getpp") {
      const target = msg.message.extendedTextMessage?.contextInfo?.participant;

      if (!target) {
        await sock.sendMessage(jid, {
          text: "Reply kwenye ujumbe wa mtu kisha andika .getpp"
        });
      } else {
        try {
          const url = await sock.profilePictureUrl(target, "image");
          await sock.sendMessage(jid, {
            image: { url },
            caption: "Profile picture"
          });
        } catch {
          await sock.sendMessage(jid, {
            text: "DP haikupatikana au imezuiwa na privacy settings."
          });
        }
      }
    }

    if (command === ".ph") {
      const target = msg.message.extendedTextMessage?.contextInfo?.participant;

      if (!target) {
        await sock.sendMessage(jid, {
          text: "Reply kwenye ujumbe wa mtu kisha andika .ph"
        });
      } else {
        const number = target.split("@")[0];
        await sock.sendMessage(jid, {
          text: `📱 Namba: +${number}\nAina ya simu haiwezi kujulikana kwa uhakika kupitia WhatsApp.`
        });
      }
    }

    if (command === ".bass" || command === ".treble") {
      await sock.sendMessage(jid, {
        text: "🎵 Audio effect hii bado inahitaji FFmpeg kuongezwa kwenye deployment."
      });
    }
  });
}

startBot();
        console.log("WHATSAPP PAIRING CODE:", code);
      } catch (error) {
        console.log("Pairing code error:", error.message);
      }
    }, 3000);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    console.log("Connection:", connection);

    if (connection === "open") {
      console.log("Matupa DML Bot imeunganishwa WhatsApp! ✅");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("Connection imefungwa.");

      if (shouldReconnect) {
        setTimeout(startBot, 3000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "Habari 👋 Mimi ni Matupa DML Bot."
      });
    }
  });
}

startBot();
