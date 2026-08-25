const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("BOT IMEUNGANISHWA NA WHATSAPP!");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        startBot();
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text === ".ping") {
      await sock.sendMessage(from, { text: "🏓 Pong! Bot iko online." });
    }

    if (text === ".alive") {
      await sock.sendMessage(from, { text: "✅ Bot iko hai na inafanya kazi." });
    }

    if (text === ".menu") {
      await sock.sendMessage(from, {
        text: `🤖 *MATUPA_DML BOT*

📌 COMMANDS

.menu - Kuona menu
.ping - Kuangalia bot
.alive - Kuona status
.owner - Owner wa bot

Zaidi ya commands tutaongeza baadaye.`
      });
    }

    if (text === ".owner") {
      await sock.sendMessage(from, {
        text: "👤 Owner wa bot: MATUPA_DML"
      });
    }
  });
}

startBot();
