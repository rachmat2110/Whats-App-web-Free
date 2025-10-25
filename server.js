import express from "express";
import bodyParser from "body-parser";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import path from "path";
import { fileURLToPath } from "url";

const { Client, LocalAuth } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
  console.log("📱 Scan QR ini untuk login WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ WhatsApp siap digunakan!");
});

client.initialize();

// Endpoint kirim pesan
app.post("/send", async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message)
    return res.status(400).send({ success: false, error: "Nomor dan pesan wajib diisi" });

  try {
    const chatId = number.startsWith("62")
      ? number + "@c.us"
      : "62" + number.replace(/^0/, "") + "@c.us";

    await client.sendMessage(chatId, message);
    res.send({ success: true });
  } catch (err) {
    console.error("❌ Error kirim pesan:", err);
    res.status(500).send({ success: false, error: "Gagal mengirim pesan" });
  }
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));