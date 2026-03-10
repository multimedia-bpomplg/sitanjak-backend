import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
import path from "path";

let sock: WASocket | null = null;
let currentQR: string | null = null;
let connectionStatus = "disconnected";
let isStarting = false;

export const startWhatsapp = async () => {
  try {
    // Jangan start ulang jika sudah connect
    if (connectionStatus === "connected" || isStarting) {
      return;
    }

    isStarting = true;

    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      auth: state,
      printQRInTerminal: false,
    });

    // DEBUG untuk melihat semua grup
    setTimeout(async () => {
      if (!sock) return;

      const groups = await sock.groupFetchAllParticipating();

      console.log("===== DAFTAR GROUP =====");

      Object.values(groups).forEach((group: any) => {
        console.log("Nama Group:", group.subject);
        console.log("ID Group:", group.id);
        console.log("--------------------");
      });
    }, 5000);

    sock.ev.on("connection.update", (update: any) => {
      const { connection, qr, lastDisconnect } = update;

      // QR hanya dibuat jika belum connected
      if (qr && connectionStatus !== "connected") {
        currentQR = qr;
        connectionStatus = "qr";
        console.log("📲 QR Generated");
      }

      if (connection === "open") {
        connectionStatus = "connected";
        currentQR = null;

        console.log("✅ WhatsApp Connected");
      }

      if (connection === "close") {
        connectionStatus = "disconnected";

        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log("🔄 Reconnecting WhatsApp...");
          startWhatsapp();
        }
      }
    });

    sock.ev.on("creds.update", saveCreds);

    isStarting = false;
  } catch (error) {
    console.error("❌ Error startWhatsapp:", error);
    isStarting = false;
  }
};

export const getWhatsapp = () => sock;
export const getQR = () => currentQR;
export const getStatus = () => connectionStatus;

export const sendWhatsappGroup = async (groupId: string, message: string) => {
  try {
    if (!sock) {
      console.log("❌ WhatsApp belum connect");
      return;
    }

    await sock.sendMessage(groupId, {
      text: message,
    });

    console.log("✅ Pesan berhasil dikirim ke grup:", groupId);
  } catch (error) {
    console.error("❌ Gagal kirim pesan grup:", error);
  }
};

// Cek Grub
export const getWhatsappGroups = async () => {
  try {
    if (!sock) {
      return [];
    }

    const groups = await sock.groupFetchAllParticipating();

    const result = Object.values(groups).map((group: any) => ({
      id: group.id,
      name: group.subject,
      participants: group.participants?.length || 0,
    }));

    return result;
  } catch (error) {
    console.error("❌ Error mengambil group:", error);
    return [];
  }
};

// reset Data
export const resetWhatsappSession = async () => {
  try {
    const sessionPath = path.join(process.cwd(), "session");

    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log("🗑 Session WhatsApp berhasil dihapus");
    }

    sock = null;
    currentQR = null;
    connectionStatus = "disconnected";

    console.log("🔄 Restart WhatsApp socket...");

    await startWhatsapp();

    console.log("✅ WhatsApp berhasil dimulai ulang");
  } catch (error) {
    console.error("❌ Gagal reset session:", error);
  }
};
