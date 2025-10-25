import express from "express";
import bodyParser from "body-parser";
import pkg from "whatsapp-web.js";
import QRCode from "qrcode";
import os from "os";

const { Client, LocalAuth } = pkg;

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

let qrCodeValue = null;
const isLinux = os.platform() === "linux";

// Inisialisasi client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "universal_session" }), // session universal
    puppeteer: {
        headless: isLinux, // true untuk Linux, false untuk Windows lokal
        args: isLinux
            ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-accelerated-2d-canvas"]
            : ["--disable-dev-shm-usage", "--disable-accelerated-2d-canvas"],
    },
});

// Event QR code
client.on("qr", (qr) => {
    qrCodeValue = qr;
    if (!isLinux) {
        console.log("📱 Scan QR ini untuk login WhatsApp (lokal):");
        const qrcodeTerminal = require("qrcode-terminal");
        qrcodeTerminal.generate(qr, { small: true });
    } else {
        console.log("📱 QR tersedia, buka endpoint /qr untuk scan (production)");
    }
});

// Endpoint untuk menampilkan QR di browser (production)
app.get("/qr", async (req, res) => {
    if (!qrCodeValue) return res.send("QR belum tersedia");
    const qrDataURL = await QRCode.toDataURL(qrCodeValue);
    res.send(`<img src="${qrDataURL}" alt="QR WhatsApp">`);
});

// Event siap
client.on("ready", () => console.log("✅ WhatsApp siap digunakan!"));

// Event auth failure
client.on("auth_failure", (msg) => console.error("❌ Gagal login:", msg));

// Event disconnect
client.on("disconnected", (reason) => {
    console.log("⚠️ WhatsApp terputus:", reason);
    client.initialize(); // auto reconnect
});

// Mulai client
client.initialize();

// Fungsi kirim pesan aman dengan retry
async function sendMessageSafe(number, message) {
    const chatId = number.startsWith("62")
        ? number + "@c.us"
        : "62" + number.replace(/^0/, "") + "@c.us";

    let chat;
    for (let i = 0; i < 10; i++) {
        try {
            chat = await client.getChatById(chatId);
            break;
        } catch (e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (!chat) throw new Error("Chat tidak tersedia / WA Web belum load");

    await chat.sendMessage(message);
}

// Endpoint kirim pesan
app.post("/send", async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message)
        return res.status(400).send({ success: false, error: "Nomor dan pesan wajib diisi" });

    try {
        await sendMessageSafe(number, message);
        res.send({ success: true });
    } catch (err) {
        console.error("❌ Error kirim pesan:", err);
        res.status(500).send({ success: false, error: err.message });
    }
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));