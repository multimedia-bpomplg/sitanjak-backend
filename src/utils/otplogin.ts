import { sendEmail } from "./sendEmail";

interface SendOtpEmailParams {
  email: string;
  otp: string;
  ipAddress: string;
}

export const sendOtpLoginEmail = async ({
  email,
  otp,
  ipAddress,
}: SendOtpEmailParams): Promise<void> => {
  try {
    await sendEmail({
      to: email,
      subject: "Kode OTP Login - SITANJAK",
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px;margin:auto;">
          <div style="background:#7F1D1D;padding:20px;border-radius:10px 10px 0 0;text-align:center;color:white;">
            <h1>SITANJAK</h1>
          </div>

          <div style="background:#f9f9f9;padding:30px;border:1px solid #eee;">
            <h2>Kode OTP Login</h2>

            <div style="background:#7F1D1D;color:white;padding:20px;text-align:center;border-radius:8px;margin:20px 0;">
              <h1 style="letter-spacing:8px;margin:0;">${otp}</h1>
            </div>

            <ul>
              <li>Berlaku 5 menit</li>
              <li>Jangan berikan kode ini ke siapa pun</li>
              <li>IP Address: ${ipAddress}</li>
              <li>Waktu: ${new Date().toLocaleString("id-ID")}</li>
            </ul>

            <hr/>
            <p style="font-size:12px;color:#777;">
              © ${new Date().getFullYear()} SITANJAK - Sistem Informasi BPOM
            </p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ ERROR SEND OTP EMAIL:", error);
    // Jangan throw error agar tidak menyebabkan 500
  }
};
