const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const http = require("http");

const PORT = process.env.PORT || 10000;
const PHONE_NUMBER = process.env.PHONE_NUMBER || "";
const OWNER_NUMBER = process.env.OWNER_NUMBER || PHONE_NUMBER;

const PREFIX = ".";

// ================= SERVER =================

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MATUPA DML BOT IS ONLINE");
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ================= SETTINGS =================

const antiLink = new Set();
const welcome = new Set();

const cooldown = new Map();

function cleanNumber(jid) {
  return jid?.split("@")[0]?.replace(/\D/g, "");
}

function isOwner(jid) {
  return cleanNumber(jid) === OWNER_NUMBER.replace(/\D/g, "");
}

function isGroup(jid) {
  return jid?.endsWith("@g.us");
}

async function getAdmins(sock, jid) {
  const metadata = await sock.groupMetadata(jid);
  return metadata.participants
    .filter(p => p.admin)
    .map(p => p.id);
}

async function isAdmin(sock, jid, user) {
  if (!isGroup(jid)) return false;

  const admins = await getAdmins(sock, jid);
  return admins.includes(user);
}

function hasLink(text) {
  return /(https?:\/\/|www\.|t\.me\/|chat\.whatsapp\.com\/|instagram\.com\/|tiktok\.com\/)/i.test(text);
}

// ================= BOT =================

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["Matupa DML Bot", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  // PAIRING CODE
  if (!state.creds.registered && PHONE_NUMBER) {
    try {
      const code = await sock.requestPairingCode(
        PHONE_NUMBER.replace(/\D/g, "")
      );

      console.log("================================");
      console.log("WHATSAPP PAIRING CODE:", code);
      console.log("================================");
    } catch (error) {
      console.log("Pairing error:", error.message);
    }
  }

  // CONNECTION
  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    console.log("Connection:", connection);

    if (connection === "open") {
      console.log("================================");
      console.log("✅ MATUPA DML BOT IMEUNGANISHWA!");
      console.log("================================");
    }

    if (connection === "close") {
      const status =
        lastDisconnect?.error?.output?.statusCode;

      console.log("Connection imefungwa.");

      if (status !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        setTimeout(startBot, 5000);
      } else {
        console.log("❌ WhatsApp session ime-logout.");
      }
    }
  });

  // ================= GROUP EVENTS =================

  sock.ev.on("group-participants.update", async (update) => {
    try {
      const { id, participants, action } = update;

      if (!welcome.has(id)) return;

      for (const user of participants) {
        const number = cleanNumber(user);

        if (action === "add") {
          await sock.sendMessage(id, {
            text:
`👋 KARIBU kwenye group!

@${number}

🤖 Mimi ni MATUPA DML BOT.

Andika *.menu* kuona commands.`,
            mentions: [user]
          });
        }

        if (action === "remove") {
          await sock.sendMessage(id, {
            text: `👋 @${number} ametoka kwenye group.`,
            mentions: [user]
          });
        }
      }
    } catch (error) {
      console.log("Group event error:", error.message);
    }
  });

  // ================= MESSAGES =================

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];

      if (!msg?.message) return;
      if (msg.key.fromMe) return;

      const jid = msg.key.remoteJid;

      if (!jid) return;

      const sender = msg.key.participant || jid;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        "";

      const body = text.trim();

      if (!body) return;

      // ================= ANTI LINK =================

      if (
        isGroup(jid) &&
        antiLink.has(jid) &&
        hasLink(body)
      ) {
        const admin = await isAdmin(sock, jid, sender);

        if (!admin && !isOwner(sender)) {
          try {
            await sock.sendMessage(jid, {
              delete: msg.key
            });

            await sock.sendMessage(jid, {
              text:
`🚫 LINK IMEZUIWA!

@${cleanNumber(sender)}

Anti-link iko ON.`,
              mentions: [sender]
            });
          } catch (error) {
            console.log("Anti-link error:", error.message);
          }

          return;
        }
      }

      // ================= COMMAND =================

      if (!body.startsWith(PREFIX)) return;

      const args = body.slice(PREFIX.length).trim().split(/\s+/);
      const command = args.shift()?.toLowerCase();

      if (!command) return;

      // ================= COOLDOWN =================

      const now = Date.now();
      const last = cooldown.get(sender) || 0;

      if (
        now - last < 1500 &&
        !isOwner(sender)
      ) {
        return;
      }

      cooldown.set(sender, now);

      // ================= MENU =================

      if (command === "menu") {
        await sock.sendMessage(jid, {
          text:
`╭━━━〔 🤖 MATUPA DML BOT 〕━━━╮
┃
┃ 👋 Karibu!
┃
┃ 📌 GENERAL
┃ • .menu
┃ • .ping
┃ • .help
┃ • .owner
┃
┃ 👥 GROUP
┃ • .antilink on
┃ • .antilink off
┃ • .welcome on
┃ • .welcome off
┃ • .tagall
┃ • .admins
┃
┃ 🛠️ ADMIN
┃ • .kick @user
┃ • .promote @user
┃ • .demote @user
┃ • .add 255XXXXXXXXX
┃
┃ 📥 DOWNLOAD
┃ • .yt <link>
┃ • .tiktok <link>
┃ • .instagram <link>
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
        });

        return;
      }

      // ================= HELP =================

      if (command === "help") {
        await sock.sendMessage(jid, {
          text:
`📚 MATUPA DML BOT HELP

Tumia .menu kuona commands zote.

Mfano:
.ping
.antilink on
.welcome on
.tagall`
        });

        return;
      }

      // ================= PING =================

      if (command === "ping") {
        await sock.sendMessage(jid, {
          text: "🏓 PONG!\n\n✅ Matupa DML Bot iko online."
        });

        return;
      }

      // ================= OWNER =================

      if (command === "owner") {
        await sock.sendMessage(jid, {
          text:
`👑 MATUPA DML BOT

Owner:
+${OWNER_NUMBER.replace(/\D/g, "")}`
        });

        return;
      }

      // ================= GROUP CHECK =================

      const groupCommands = [
        "antilink",
        "welcome",
        "tagall",
        "admins",
        "kick",
        "promote",
        "demote",
        "add"
      ];

      if (
        groupCommands.includes(command) &&
        !isGroup(jid)
      ) {
        await sock.sendMessage(jid, {
          text: "❌ Command hii inafanya kazi kwenye group tu."
        });

        return;
      }

      // ================= ANTI LINK =================

      if (command === "antilink") {
        const admin = await isAdmin(sock, jid, sender);

        if (!admin && !isOwner(sender)) {
          await sock.sendMessage(jid, {
            text: "❌ Admin pekee anaweza kutumia command hii."
          });
          return;
        }

        const option = args[0]?.toLowerCase();

        if (option === "on") {
          antiLink.add(jid);

          await sock.sendMessage(jid, {
            text: "✅ Anti-link imewashwa."
          });
        }

        else if (option === "off") {
          antiLink.delete(jid);

          await sock.sendMessage(jid, {
            text: "✅ Anti-link imezimwa."
          });
        }

        else {
          await sock.sendMessage(jid, {
            text: "Tumia:\n.antilink on\n.antilink off"
          });
        }

        return;
      }

      // ================= WELCOME =================

      if (command === "welcome") {
        const admin = await isAdmin(sock, jid, sender);

        if (!admin && !isOwner(sender)) {
          await sock.sendMessage(jid, {
            text: "❌ Admin pekee anaweza kutumia command hii."
          });
          return;
        }

        const option = args[0]?.toLowerCase();

        if (option === "on") {
          welcome.add(jid);

          await sock.sendMessage(jid, {
            text: "✅ Welcome/Farewell imewashwa."
          });
        }

        else if (option === "off") {
          welcome.delete(jid);

          await sock.sendMessage(jid, {
            text: "✅ Welcome/Farewell imezimwa."
          });
        }

        else {
          await sock.sendMessage(jid, {
            text: "Tumia:\n.welcome on\n.welcome off"
          });
        }

        return;
      }

      // ================= ADMINS =================

      if (command === "admins") {
        const metadata = await sock.groupMetadata(jid);

        const admins = metadata.participants
          .filter(p => p.admin)
          .map(p => `@${cleanNumber(p.id)}`);

        await sock.sendMessage(jid, {
          text:
`👑 GROUP ADMINS

${admins.join("\n")}`,
          mentions: metadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
        });

        return;
      }

      // ================= TAG ALL =================

      if (command === "tagall") {
        const admin = await isAdmin(sock, jid, sender);

        if (!admin && !isOwner(sender)) {
          await sock.sendMessage(jid, {
            text: "❌ Admin pekee anaweza kutumia command hii."
          });
          return;
        }

        const metadata = await sock.groupMetadata(jid);

        const members = metadata.participants;

        let message = "📢 MATUPA DML TAG ALL\n\n";

        for (const member of members) {
          message += `@${cleanNumber(member.id)} `;
        }

        await sock.sendMessage(jid, {
          text: message,
          mentions: members.map(m => m.id)
        });

        return;
      }

      // ================= TARGET =================

      const mentioned =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

      const target =
        mentioned[0] ||
        msg.message.extendedTextMessage?.contextInfo?.participant;

      // ================= KICK =================

      if (command === "kick") {
        const admin = await isAdmin(sock, jid, sender);

        if (!admin && !isOwner(sender)) {
          await sock.sendMessage(jid, {
            text: "❌ Admin pekee anaweza kutumia command hii."
          });
          return;
        }

        if (!target) {
          await sock.sendMessage(jid, {
            text: "❌ Mention user.\nMfano: .kick @user"
          });
          return;
        }

        await sock.groupParticipantsUpdate(
          jid,
          [target],
          "remove"
        );

        return;
      }

      // ================= PROMOTE =================

      if (command === "promote") {
        const admin = await isAdmin(sock, jid, sender);

        if (!admin && !isOwner(sender)) {
          await sock.sendMessage(jid, {
            text: "❌ Admin pekee."
          });
          return;
        }

        if (!target) {
          await sock.sendMessage(jid, {
            text: "❌ Mention user."
          });
          return;
        }

        await sock.groupParticipantsUpdate(
          jid,
          [target],
          "promote"
        );

        return;
      }

      // ================= DEMOTE =================

      if (command === "demote") {
        const admin = await isAdmin(sock, jid, sender);

        if (!admin && !isOwner(sender)) {
          await sock.sendMessage(jid, {
            text: "❌ Admin pekee."
          });
          return;
        }

        if (!target) {
          await sock.sendMessage(jid, {
            text: "❌ Mention user."
          });
          return;
        }

        await sock.groupParticipantsUpdate(
          jid,
          [target],
          "demote"
        );

        return;
      }

      // ================= ADD =================

      if (command === "add") {
        const admin = await isAdmin(sock, jid, sender);

        if (!admin && !isOwner(sender)) {
          await sock.sendMessage(jid, {
            text: "❌ Admin pekee."
          });
          return;
        }

        const number = args[0]?.replace(/\D/g, "");

        if (!number) {
          await sock.sendMessage(jid, {
            text: "Mfano:\n.add 255639000000"
          });
          return;
        }

        await sock.groupParticipantsUpdate(
          jid,
          [`${number}@s.whatsapp.net`],
          "add"
        );

        return;
      }

      // ================= DOWNLOADERS =================

      if (
        command === "yt" ||
        command === "tiktok" ||
        command === "instagram"
      ) {
        const link = args[0];

        if (!link) {
          await sock.sendMessage(jid, {
            text:
`📥 Tumia:
.${command} <link>

Mfano:
.${command} https://example.com/video`
          });

          return;
        }

        await sock.sendMessage(jid, {
          text:
`📥 ${command.toUpperCase()} DOWNLOADER

Link imepokelewa ✅

Downloader provider bado haijawekwa kwenye bot.

Tutaiunganisha na API/provider halali bila kuweka API key kwenye GitHub.`
        });

        return;
      }

      // ================= AUTO REPLY =================

      const lower = body.toLowerCase();

      if (
        lower === "hello" ||
        lower === "habari" ||
        lower === "hi"
      ) {
        await sock.sendMessage(jid, {
          text: "Habari 👋\n\n🤖 Mimi ni Matupa DML Bot.\nAndika *.menu* kuona commands."
        });

        return;
      }

    } catch (error) {
      console.log("Message error:", error.message);
    }
  });
}

startBot().catch(error => {
  console.error("BOT START ERROR:", error);
});
