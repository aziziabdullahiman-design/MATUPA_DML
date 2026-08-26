const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const http = require("http");

const PORT = process.env.PORT || 10000;
const PHONE_NUMBER = process.env.PHONE_NUMBER;

// ===============================
// RENDER WEB SERVER
// ===============================

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("Matupa DML Bot is running!");
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ===============================
// BOT SETTINGS
// ===============================

const settings = {
  mode: "public",
  autoreact: false,
  autoreply: false,
  antilink: false,
  antimentionstatus: false,
  antibot: false
};

// ===============================
// START BOT
// ===============================

async function startBot() {
  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("auth_new_2");

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["Matupa DML Bot", "Chrome", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    let pairingRequested = false;

    // ===============================
    // CONNECTION
    // ===============================

    sock.ev.on("connection.update", async (update) => {
      const {
        connection,
        lastDisconnect
      } = update;

      console.log("Connection:", connection);

      // REQUEST PAIRING CODE
      if (
        connection === "connecting" &&
        !state.creds.registered &&
        PHONE_NUMBER &&
        !pairingRequested
      ) {
        pairingRequested = true;

        try {
          const number =
            PHONE_NUMBER.replace(/\D/g, "");

          console.log(
            "Requesting WhatsApp pairing code..."
          );

          const code =
            await sock.requestPairingCode(number);

          console.log(
            "================================"
          );

          console.log(
            "WHATSAPP PAIRING CODE:",
            code
          );

          console.log(
            "================================"
          );

        } catch (error) {
          console.log(
            "PAIRING ERROR:",
            error.message
          );

          pairingRequested = false;
        }
      }

      // CONNECTED
      if (connection === "open") {
        console.log(
          "================================"
        );

        console.log(
          "Matupa DML Bot imeunganishwa WhatsApp! ✅"
        );

        console.log(
          "================================"
        );
      }

      // DISCONNECTED
      if (connection === "close") {
        const status =
          lastDisconnect?.error?.output?.statusCode;

        console.log(
          "Connection imefungwa:",
          status
        );

        if (
          status !== DisconnectReason.loggedOut
        ) {
          console.log(
            "Bot inajaribu kuunganisha tena..."
          );

          setTimeout(() => {
            startBot();
          }, 5000);
        } else {
          console.log(
            "WhatsApp ime-logout. Pairing mpya inahitajika."
          );
        }
      }
    });

    // ===============================
    // MESSAGES
    // ===============================

    sock.ev.on(
      "messages.upsert",
      async ({ messages }) => {
        try {
          const msg = messages[0];

          if (!msg?.message) return;
          if (msg.key.fromMe) return;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

          const command =
            text.trim().toLowerCase();

          const jid =
            msg.key.remoteJid;

          if (!jid) return;

          // PRIVATE MODE
          if (
            settings.mode === "private" &&
            jid.endsWith("@g.us")
          ) {
            return;
          }

          // ===============================
          // PING
          // ===============================

          if (command === ".ping") {
            await sock.sendMessage(jid, {
              text: "🏓 Pong! Bot inafanya kazi."
            });
          }

          // ===============================
          // HI
          // ===============================

          if (
            command === ".hi" ||
            command === "hi"
          ) {
            await sock.sendMessage(jid, {
              text:
                "Habari 👋 Mimi ni Matupa DML Bot."
            });
          }

          // ===============================
          // MENU
          // ===============================

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

          // ===============================
          // MODE
          // ===============================

          if (command === ".mode") {
            await sock.sendMessage(jid, {
              text:
`⚙️ *BOT MODE*

Current mode:
${
  settings.mode === "public"
    ? "PUBLIC 🌐"
    : "PRIVATE 🔒"
}

.modeprivate
.modepublic`
            });
          }

          // ===============================
          // PRIVATE MODE
          // ===============================

          if (command === ".modeprivate") {
            settings.mode = "private";

            await sock.sendMessage(jid, {
              text:
                "🔒 Private mode ON."
            });
          }

          // ===============================
          // PUBLIC MODE
          // ===============================

          if (command === ".modepublic") {
            settings.mode = "public";

            await sock.sendMessage(jid, {
              text:
                "🌐 Public mode ON."
            });
          }

          // ===============================
          // SETTINGS
          // ===============================

          if (command === ".settings") {
            await sock.sendMessage(jid, {
              text:
`⚙️ *MATUPA DML SETTINGS*

Mode: ${settings.mode}
Autoreact: ${
  settings.autoreact
    ? "ON ✅"
    : "OFF ❌"
}
Autoreply: ${
  settings.autoreply
    ? "ON ✅"
    : "OFF ❌"
}
Antilink: ${
  settings.antilink
    ? "ON ✅"
    : "OFF ❌"
}
AntiMentionStatus: ${
  settings.antimentionstatus
    ? "ON ✅"
    : "OFF ❌"
}
Antibot: ${
  settings.antibot
    ? "ON ✅"
    : "OFF ❌"
}`
            });
          }

          // ===============================
          // AUTOREACT
          // ===============================

          if (command === ".autoreact on") {
            settings.autoreact = true;

            await sock.sendMessage(jid, {
              text:
                "🤖 Autoreact ON ✅"
            });
          }

          if (command === ".autoreact off") {
            settings.autoreact = false;

            await sock.sendMessage(jid, {
              text:
                "🤖 Autoreact OFF ❌"
            });
          }

          // ===============================
          // AUTOREPLY
          // ===============================

          if (command === ".autoreply on") {
            settings.autoreply = true;

            await sock.sendMessage(jid, {
              text:
                "💬 Autoreply ON ✅"
            });
          }

          if (command === ".autoreply off") {
            settings.autoreply = false;

            await sock.sendMessage(jid, {
              text:
                "💬 Autoreply OFF ❌"
            });
          }

          // ===============================
          // ANTILINK
          // ===============================

          if (command === ".antilink on") {
            settings.antilink = true;

            await sock.sendMessage(jid, {
              text:
                "🔗 Antilink ON ✅"
            });
          }

          if (command === ".antilink off") {
            settings.antilink = false;

            await sock.sendMessage(jid, {
              text:
                "🔗 Antilink OFF ❌"
            });
          }

          // ===============================
          // ANTI MENTION STATUS
          // ===============================

          if (
            command ===
            ".antimentionstatus on"
          ) {
            settings.antimentionstatus = true;

            await sock.sendMessage(jid, {
              text:
                "📢 AntiMentionStatus ON ✅"
            });
          }

          if (
            command ===
            ".antimentionstatus off"
          ) {
            settings.antimentionstatus = false;

            await sock.sendMessage(jid, {
              text:
                "📢 AntiMentionStatus OFF ❌"
            });
          }

          // ===============================
          // ANTIBOT
          // ===============================

          if (command === ".antibot on") {
            settings.antibot = true;

            await sock.sendMessage(jid, {
              text:
                "🤖 Antibot ON ✅"
            });
          }

          if (command === ".antibot off") {
            settings.antibot = false;

            await sock.sendMessage(jid, {
              text:
                "🤖 Antibot OFF ❌"
            });
          }

        } catch (error) {
          console.log(
            "MESSAGE ERROR:",
            error.message
          );
        }
      }
    );

  } catch (error) {
    console.log(
      "BOT START ERROR:",
      error.message
    );

    setTimeout(() => {
      startBot();
    }, 5000);
  }
}

// ===============================
// START
// ===============================

startBot();
