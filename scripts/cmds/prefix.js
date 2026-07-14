const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { utils } = global;

module.exports = {
  config: {
    name: "prefix",
    version: "1.4",
    author: "Chris",
    countDown: 5,
    role: 0,
    description: "Modifier le préfixe + affichage canvas stylé",
    category: "config",
    guide: {
      en:
        "{pn} <nouveau préfixe>\n" +
        "{pn} <nouveau préfixe> -g\n" +
        "{pn} reset\n" +
        "Écris juste prefix → affiche les infos"
    }
  },

  langs: {
    en: {
      reset: "⚡ ʟᴇ ᴘʀᴇ́ғɪxᴇ ᴀ ᴇ́ᴛᴇ́ ʀᴇ́ɪɴɪᴛɪᴀʟɪsᴇ́ : %1",
      onlyAdmin: "❌ sᴇᴜʟ ᴜɴ ʜᴏᴋᴀɢᴇ (ᴀᴅᴍɪɴ) ᴘᴇᴜᴛ ᴍᴏᴅɪғɪᴇʀ",
      confirmGlobal: "⚠️ ʀᴇ́ᴀɢɪs ᴘᴏᴜʀ ᴄᴏɴғɪʀᴍᴇʀ (ɢʟᴏʙᴀʟ)",
      confirmThisThread: "⚠️ ʀᴇ́ᴀɢɪs ᴘᴏᴜʀ ᴄᴏɴғɪʀᴍᴇʀ (ɢʀᴏᴜᴘᴇ)",

      // 🔥 EXACTEMENT TON STYLE
      successGlobal: "✅ ᴘʀᴇ́ғɪxᴇ sʏsᴛᴇ̀ᴍᴇ ᴍᴏᴅɪғɪᴇ́ ᴀᴠᴇᴄ sᴜᴄᴄᴇ̀s : %1",
      successThisThread: "✅ ᴘʀᴇ́ғɪxᴇ ᴅᴇ ᴄᴇ ɢʀᴏᴜᴘᴇ ᴍᴏᴅɪғɪᴇ́ : %1. ʟᴇ sᴄᴇᴀᴜ ᴇsᴛ ᴘʟᴀᴄᴇ́ !",

      myPrefix:
        "〔 ʜᴇʏ %1, ᴛᴜ ᴀs ʙᴇsᴏɪɴ ᴅᴇ ᴍᴏɴ sᴄᴇᴀᴜ ᴅᴇ ᴛᴇ́ʟᴇ́ᴘᴏʀᴛᴀᴛɪᴏɴ ‽ 〕 \n\n" +
        "┣ ᴘʀᴇ́ꜰɪxᴇ ɢʟᴏʙᴀʟ : %2\n" +
        "┣ ᴘʀᴇ́ꜰɪxᴇ ɪᴄɪ : %3\n" +
        "┣ ᴍᴇɴᴜ ᴅᴇs ᴊᴜᴛsᴜs : ʜᴇʟᴘ\n" +
        "┣ ᴅᴇ́ᴠᴇʟᴏᴘᴘᴇᴜʀ : ᴄʜʀɪs ☠️\n\n" +
        "〔 ᴊᴇ sᴜɪs %4, ᴘʀᴇ̂ᴛ ᴀ̀ ᴘʀᴏᴛᴇ́ɢᴇʀ ʟᴇ ᴠɪʟʟᴀɢᴇ ᴀ̀ ᴛᴇs ᴄᴏ̂ᴛᴇ́s 🍃 〕"
    }
  },

  // =========================
  // ⚙️ SET PREFIX
  // =========================
  onStart: async function ({
    message,
    role,
    args,
    commandName,
    event,
    threadsData,
    getLang,
    api
  }) {
    if (!args[0]) return message.SyntaxError();

    if (args[0] === "reset") {
      const botID = global.botID || api.getCurrentUserID();
      await threadsData.set(event.threadID, null, `data.prefix_${botID}`);
      await threadsData.set(event.threadID, null, "data.prefix");
      return message.reply(getLang("reset", global.GoatBot.config.prefix));
    }

    const newPrefix = args[0];

    const formSet = {
      commandName,
      author: event.senderID,
      newPrefix
    };

    if (args[1] === "-g") {
      if (role < 2) return message.reply(getLang("onlyAdmin"));
      formSet.setGlobal = true;
    } else {
      formSet.setGlobal = false;
    }

    return message.reply(
      args[1] === "-g"
        ? getLang("confirmGlobal")
        : getLang("confirmThisThread"),
      (err, info) => {
        if (err) return;
        formSet.messageID = info.messageID;
        global.GoatBot.onReaction.set(info.messageID, formSet);
      }
    );
  },

  // =========================
  // 🔁 CONFIRMATION
  // =========================
  onReaction: async function ({
    message,
    threadsData,
    event,
    Reaction,
    getLang,
    api
  }) {
    const { author, newPrefix, setGlobal } = Reaction;
    if (event.userID !== author) return;

    if (setGlobal) {
      global.GoatBot.config.prefix = newPrefix;
      fs.writeFileSync(
        global.client.dirConfig,
        JSON.stringify(global.GoatBot.config, null, 2)
      );
      return message.reply(getLang("successGlobal", newPrefix));
    } else {
      const botID = global.botID || api.getCurrentUserID();
      await threadsData.set(
        event.threadID,
        newPrefix,
        `data.prefix_${botID}`
      );
      return message.reply(getLang("successThisThread", newPrefix));
    }
  },

  // =========================
  // 🎨 DISPLAY PREFIX + CANVAS
  // =========================
  onChat: async function ({ event, message, getLang, usersData }) {
    if (!event.body || event.body.toLowerCase() !== "prefix") return;

    const userName = await usersData.getName(event.senderID);
    const botName = "🥷 𝙼𝚒𝚗𝚊𝚝𝚘 𝚔𝚊𝚖𝚒𝚔𝚊𝚣𝚎🌀";
    const globalPrefix = global.GoatBot.config.prefix;
    const threadPrefix =
      utils.getPrefix(event.threadID) || globalPrefix;

    // 🎨 Canvas
    const canvas = createCanvas(900, 500);
    const ctx = canvas.getContext("2d");

    const bg = await loadImage("https://i.imgur.com/HwiR4cT.png");
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#d8b4fe";
    ctx.font = "bold 40px Sans";
    ctx.textAlign = "center";
    ctx.fillText("MINATO PREFIX SYSTEM", canvas.width / 2, 80);

    ctx.fillStyle = "#ffffff";
    ctx.font = "26px Sans";

    ctx.fillText(`User: ${userName}`, canvas.width / 2, 160);
    ctx.fillText(`Global: ${globalPrefix}`, canvas.width / 2, 210);
    ctx.fillText(`Here: ${threadPrefix}`, canvas.width / 2, 260);

    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    const date = now.toDateString();

    ctx.fillText(`Time: ${time}`, canvas.width / 2, 310);
    ctx.fillText(`Date: ${date}`, canvas.width / 2, 360);

    ctx.font = "italic 20px Sans";
    ctx.fillStyle = "#c084fc";
    ctx.fillText(`Powered by ${botName}`, canvas.width / 2, 430);

    const buffer = canvas.toBuffer();
    const folder = path.join(__dirname, "cache");
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);

    const filePath = path.join(folder, `prefix_${event.senderID}.png`);
    fs.writeFileSync(filePath, buffer);

    return message.reply({
      body: getLang("myPrefix", userName, globalPrefix, threadPrefix, botName),
      attachment: fs.createReadStream(filePath)
    });
  }
};
