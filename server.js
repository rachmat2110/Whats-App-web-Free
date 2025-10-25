import express from "express";
import bodyParser from "body-parser";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import os from "os";

const { Client, LocalAuth } = pkg;

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// Deteksi platform
const isLinux = os.platform() === "linux";

// Inisialisasi client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: isLinux, // headless di Linux/Railway, tampil di local
        args: isLinux
            ? [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
            ]
            : [
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
            ],
    },
});

// Event QR code
client.on("qr", (qr) => {
    console.log("📱 Scan QR ini untuk login WhatsApp:");
    qrcode.generate(qr, { small: true });
});

// Event siap
client.on("ready", () => {
    console.log("✅ WhatsApp siap digunakan!");
});

// Event error login
client.on("auth_failure", (msg) => {
    console.error("❌ Gagal login:", msg);
});

// Event disconnect
client.on("disconnected", (reason) => {
    console.log("⚠️ WhatsApp terputus:", reason);
    client.initialize(); // auto reconnect
});

// Mulai client
client.initialize();

// Endpoint kirim pesan
app.post("/send", async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).send({ success: false, error: "Nomor dan pesan wajib diisi" });
    }

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