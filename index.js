const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
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

const settings = {
  mode: "public",
  autoreact: false,
  autoreply: false,
  antilink: false,
  antimentionstatus: false,
  antibot: false
};

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_new_2");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  let pairingRequested = false;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    console.log("Connection:", connection);

    if (
      connection === "connecting" &&
      !state.creds.registered &&
      PHONE_NUMBER &&
      !pairingRequested
    ) {
      pairingRequested = true;

      try {
        const number = PHONE_NUMBER.replace(/\D/g, "");

        console.log("Requesting WhatsApp pairing code...");

        const code =
          await sock.requestPairingCode(number);

        console.log(
          "WHATSAPP PAIRING CODE:",
          code
        );
      } catch (error) {
        console.log(
          "PAIRING ERROR:",
          error.message
        );
      }
    }

    if (connection === "open") {
      console.log(
        "Matupa DML Bot imeunganishwa WhatsApp! ✅"
      );
    }

    if (connection === "close") {
      const status =
        lastDisconnect?.error?.output?.statusCode;

      console.log("Connection imefungwa:", status);

      if (status !== DisconnectReason.loggedOut) {
        setTimeout(startBot, 3000);
      }
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

    if (
      settings.mode === "private" &&
      jid.endsWith("@g.us")
    ) {
      return;
    }

    if (command === ".ping") {
      await sock.sendMessage(jid, {
        text: "🏓 Pong! Bot inafanya kazi."
      });
    }

    if (command === ".hi" || command === "hi") {
      await sock.sendMessage(jid, {
        text: "Habari 👋 Mimi ni Matupa DML Bot."
      });
    }

    if (command === ".menu") {
      await sock.sendMessage(jid, {
        text:
`🤖 *MATUPA DML BOT*

📋 *COMMANDS*

.menu
.ping
.hi

⚙️ *MODE*
.mode
.settings
.modeprivate
.modepublic

🛡️ *SECURITY*
.antilink on/off
.antimentionstatus on/off
.antibot on/off

🤖 *AUTO*
.autoreact on/off
.autoreply on/off`
      });
    }

    if (command === ".mode") {
      await sock.sendMessage(jid, {
        text:
`⚙️ *BOT MODE*

Current mode:
${settings.mode === "public" ? "PUBLIC 🌐" : "PRIVATE 🔒"}

.modeprivate
.modepublic`
      });
    }

    if (command === ".modeprivate") {
      settings.mode = "private";

      await sock.sendMessage(jid, {
        text: "🔒 Private mode ON."
      });
    }

    if (command === ".modepublic") {
      settings.mode = "public";

      await sock.sendMessage(jid, {
        text: "🌐 Public mode ON."
      });
    }

    if (command === ".settings") {
      await sock.sendMessage(jid, {
        text:
`⚙️ *MATUPA DML SETTINGS*

Mode: ${settings.mode}
Autoreact: ${settings.autoreact ? "ON ✅" : "OFF ❌"}
Autoreply: ${settings.autoreply ? "ON ✅" : "OFF ❌"}
Antilink: ${settings.antilink ? "ON ✅" : "OFF ❌"}
AntiMentionStatus: ${settings.antimentionstatus ? "ON ✅" : "OFF ❌"}
Antibot: ${settings.antibot ? "ON ✅" : "OFF ❌"}`
      });
    }

    if (command === ".autoreact on") {
      settings.autoreact = true;

      await sock.sendMessage(jid, {
        text: "🤖 Autoreact ON ✅"
      });
    }

    if (command === ".autoreact off") {
      settings.autoreact = false;

      await sock.sendMessage(jid, {
        text: "🤖 Autoreact OFF ❌"
      });
    }

    if (command === ".autoreply on") {
      settings.autoreply = true;

      await sock.sendMessage(jid, {
        text: "💬 Autoreply ON ✅"
      });
    }

    if (command === ".autoreply off") {
      settings.autoreply = false;

      await sock.sendMessage(jid, {
        text: "💬 Autoreply OFF ❌"
      });
    }

    if (command === ".antilink on") {
      settings.antilink = true;

      await sock.sendMessage(jid, {
        text: "🔗 Antilink ON ✅"
      });
    }

    if (command === ".antilink off") {
      settings.antilink = false;

      await sock.sendMessage(jid, {
        text: "🔗 Antilink OFF ❌"
      });
    }

    if (command === ".antimentionstatus on") {
      settings.antimentionstatus = true;

      await sock.sendMessage(jid, {
        text: "📢 AntiMentionStatus ON ✅"
      });
    }

    if (command === ".antimentionstatus off") {
      settings.antimentionstatus = false;

      await sock.sendMessage(jid, {
        text: "📢 AntiMentionStatus OFF ❌"
      });
    }

    if (command === ".antibot on") {
      settings.antibot = true;

      await sock.sendMessage(jid, {
        text: "🤖 Antibot ON ✅"
      });
    }

    if (command === ".antibot off") {
      settings.antibot = false;

      await sock.sendMessage(jid, {
        text: "🤖 Antibot OFF ❌"
      });
    }
  });
}

startBot();
