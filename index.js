const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const http = require("http");

const PORT = process.env.PORT || 10000;
const PHONE_NUMBER = process.env.PHONE_NUMBER;

// ====================
// SERVER
// ====================

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Matupa DML Bot is running!");
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ====================
// SETTINGS
// ====================

const settings = {
  autoreply: false,
  autoreact: false,
  antilink: false,
  antimentionstatus: false,
  antibot: false,
  mode: "public"
};

// ====================
// START BOT
// ====================

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  // ====================
  // PAIRING CODE
  // ====================

  if (!state.creds.registered && PHONE_NUMBER) {
    setTimeout(async () => {
      try {
        const number = PHONE_NUMBER.replace(/\D/g, "");

        console.log("Requesting pairing code for:", number);

        const code =
          await sock.requestPairingCode(number);

        console.log(
          "WHATSAPP PAIRING CODE:",
          code
        );

      } catch (error) {

        console.log(
          "Pairing code error:",
          error.message
        );
      }
    }, 3000);
  }

  // ====================
  // CONNECTION
  // ====================

  sock.ev.on(
    "connection.update",
    ({ connection, lastDisconnect }) => {

      console.log("Connection:", connection);

      if (connection === "open") {
        console.log(
          "Matupa DML Bot imeunganishwa WhatsApp! ✅"
        );
      }

      if (connection === "close") {

        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut;

        console.log(
          "Connection imefungwa."
        );

        if (shouldReconnect) {
          setTimeout(startBot, 3000);
        }
      }
    }
  );

  // ====================
  // MESSAGES
  // ====================

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {

      const msg = messages[0];

      if (!msg?.message || msg.key.fromMe) {
        return;
      }

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      const command =
        text.trim().toLowerCase();

      const jid = msg.key.remoteJid;

      const isGroup =
        jid.endsWith("@g.us");

      // ====================
      // PRIVATE MODE
      // ====================

      if (
        settings.mode === "private" &&
        isGroup
      ) {
        return;
      }

      // ====================
      // PING
      // ====================

      if (command === ".ping") {

        await sock.sendMessage(jid, {
          text:
            "🏓 Pong! Bot inafanya kazi."
        });

      }

      // ====================
      // HI
      // ====================

      if (
        command === ".hi" ||
        command === "hi"
      ) {

        await sock.sendMessage(jid, {
          text:
            "Habari 👋 Mimi ni Matupa DML Bot."
        });

      }

      // ====================
      // MENU
      // ====================

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
• .treble

⚙️ *MODE*
• .mode
• .settings
• .modeprivate
• .modepublic

🛡️ *SECURITY*
• .antilink on/off
• .antimentionstatus on/off
• .antibot on/off

🤖 *AUTO*
• .autoreact on/off
• .autoreply on/off`
        });

      }

      // ====================
      // MODE
      // ====================

      if (command === ".mode") {

        await sock.sendMessage(jid, {
          text: `⚙️ *MATUPA DML BOT MODE*

🌐 Current mode:
${
  settings.mode === "public"
    ? "PUBLIC ✅"
    : "PRIVATE 🔒"
}

🔒 .modeprivate
🌐 .modepublic

🤖 .autoreact on/off
💬 .autoreply on/off
🔗 .antilink on/off
📢 .antimentionstatus on/off
🤖 .antibot on/off`
        });

      }

      // ====================
      // PRIVATE MODE
      // ====================

      if (command === ".modeprivate") {

        settings.mode = "private";

        await sock.sendMessage(jid, {
          text:
            "🔒 Private mode imewashwa.\nBot itatumika kwenye inbox/private pekee."
        });

      }

      // ====================
      // PUBLIC MODE
      // ====================

      if (command === ".modepublic") {

        settings.mode = "public";

        await sock.sendMessage(jid, {
          text:
            "🌐 Public mode imewashwa.\nBot inaweza kutumika private na groups."
        });

      }

      // ====================
      // SETTINGS
      // ====================

      if (command === ".settings") {

        await sock.sendMessage(jid, {
          text: `⚙️ *MATUPA DML SETTINGS*

🌐 Mode:
${
  settings.mode === "public"
    ? "PUBLIC ✅"
    : "PRIVATE 🔒"
}

🤖 Autoreact:
${
  settings.autoreact
    ? "ON ✅"
    : "OFF ❌"
}

💬 Autoreply:
${
  settings.autoreply
    ? "ON ✅"
    : "OFF ❌"
}

🔗 Antilink:
${
  settings.antilink
    ? "ON ✅"
    : "OFF ❌"
}

📢 AntiMentionStatus:
${
  settings.antimentionstatus
    ? "ON ✅"
    : "OFF ❌"
}

🤖 Antibot:
${
  settings.antibot
    ? "ON ✅"
    : "OFF ❌"
}`
        });

      }

      // ====================
      // AUTOREACT
      // ====================

      if (command === ".autoreact on") {

        settings.autoreact = true;

        await sock.sendMessage(jid, {
          text:
            "🤖 Autoreact imewashwa ✅"
        });

      }

      if (command === ".autoreact off") {

        settings.autoreact = false;

        await sock.sendMessage(jid, {
          text:
            "🤖 Autoreact imezimwa ❌"
        });

      }

      // ====================
      // AUTOREPLY
      // ====================

      if (command === ".autoreply on") {

        settings.autoreply = true;

        await sock.sendMessage(jid, {
          text:
            "💬 Autoreply imewashwa ✅"
        });

      }

      if (command === ".autoreply off") {

        settings.autoreply = false;

        await sock.sendMessage(jid, {
          text:
            "💬 Autoreply imezimwa ❌"
        });

      }

      // ====================
      // ANTILINK
      // ====================

      if (command === ".antilink on") {

        settings.antilink = true;

        await sock.sendMessage(jid, {
          text:
            "🔗 Antilink imewashwa ✅"
        });

      }

      if (command === ".antilink off") {

        settings.antilink = false;

        await sock.sendMessage(jid, {
          text:
            "🔗 Antilink imezimwa ❌"
        });

      }

      // ====================
      // ANTI MENTION STATUS
      // ====================

      if (
        command ===
        ".antimentionstatus on"
      ) {

        settings.antimentionstatus = true;

        await sock.sendMessage(jid, {
          text:
            "📢 AntiMentionStatus imewashwa ✅"
        });

      }

      if (
        command ===
        ".antimentionstatus off"
      ) {

        settings.antimentionstatus = false;

        await sock.sendMessage(jid, {
          text:
            "📢 AntiMentionStatus imezimwa ❌"
        });

      }

      // ====================
      // ANTIBOT
      // ====================

      if (command === ".antibot on") {

        settings.antibot = true;

        await sock.sendMessage(jid, {
          text:
            "🤖 Antibot imewashwa ✅"
        });

      }

      if (command === ".antibot off") {

        settings.antibot = false;

        await sock.sendMessage(jid, {
          text:
            "🤖 Antibot imezimwa ❌"
        });

      }

      // ====================
      // TIME
      // ====================

      if (command === ".time") {

        const time =
          new Date().toLocaleTimeString("sw-TZ");

        await sock.sendMessage(jid, {
          text: `🕒 Saa: ${time}`
        });

      }

      // ====================
      // DATE
      // ====================

      if (command === ".date") {

        const date =
          new Date().toLocaleDateString("sw-TZ");

        await sock.sendMessage(jid, {
          text: `📅 Tarehe: ${date}`
        });

      }

      // ====================
      // OWNER
      // ====================

      if (command === ".owner") {

        await sock.sendMessage(jid, {
          text:
            "👤 Owner: Matupa DML"
        });

      }

      // ====================
      // GET PROFILE PICTURE
      // ====================

      if (command === ".getpp") {

        const target =
          msg.message.extendedTextMessage
            ?.contextInfo
            ?.participant;

        if (!target) {

          await sock.sendMessage(jid, {
            text:
              "Reply kwenye ujumbe wa mtu, kisha andika .getpp"
          });

        } else {

          try {

            const url =
              await sock.profilePictureUrl(
                target,
                "image"
              );

            await sock.sendMessage(jid, {
              image: { url },
              caption:
                "Profile picture"
            });

          } catch (error) {

            await sock.sendMessage(jid, {
              text:
                "DP haikupatikana au privacy settings zimeizuia."
            });

          }
        }
      }

      // ====================
      // PHONE
      // ====================

      if (command === ".ph") {

        const target =
          msg.message.extendedTextMessage
            ?.contextInfo
            ?.participant;

        if (!target) {

          await sock.sendMessage(jid, {
            text:
              "Reply kwenye ujumbe wa mtu, kisha andika .ph"
          });

        } else {

          const number =
            target.split("@")[0];

          await sock.sendMessage(jid, {
            text:
              `📱 Namba: +${number}\nAina ya simu haiwezi kujulikana kwa uhakika kupitia WhatsApp.`
          });

        }
      }

      // ====================
      // BASS
      // ====================

      if (command === ".bass") {

        await sock.sendMessage(jid, {
          text:
            "🎵 Bass effect bado inahitaji FFmpeg."
        });

      }

      // ====================
      // TREBLE
      // ====================

      if (command === ".treble") {

        await sock.sendMessage(jid, {
          text:
            "🎵 Treble effect bado inahitaji FFmpeg."
        });

      }

    }
  );
}

startBot();
