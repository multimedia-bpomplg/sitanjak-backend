import nodemailer from "nodemailer";

export const SendLupaPassword = async (to: string, otp: string) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    family: 4, // ⬅️ PAKSA IPv4 (INI KUNCI UTAMA)
  });

  await transporter.sendMail({
    from: `"BPOM System" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Kode Reset Password",
    html: `
      <div style="font-family:Arial;padding:20px">
        <h2>Kode Reset Password</h2>
        <p>Gunakan kode berikut untuk mengatur ulang password Anda:</p>
        <h1 style="letter-spacing:6px">${otp}</h1>
        <p>Kode berlaku selama <b>10 menit</b></p>
      </div>
    `,
  });
};
