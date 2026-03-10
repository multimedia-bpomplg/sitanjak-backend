import { getWhatsapp } from "./whatsappClient";

export const sendWhatsapp = async (phone: string, message: string) => {
  try {
    const sock = getWhatsapp();

    if (!sock) {
      console.log("❌ WhatsApp belum terkoneksi");
      return;
    }

    const nomor = phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await sock.sendMessage(nomor, {
      text: message,
    });

    console.log("✅ Pesan terkirim ke:", phone);
  } catch (error) {
    console.error("❌ Gagal kirim WhatsApp:", error);
  }
};
