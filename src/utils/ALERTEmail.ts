export const passwordChangedEmail = (nama: string, email: string) => {
  return {
    subject: "🔐 Password Akun Anda Berhasil Diganti",
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6">
        <h2 style="color:#0f766e">Password Berhasil Diganti</h2>

        <p>Halo <b>${nama}</b>,</p>

        <p>
          Kami ingin memberitahukan bahwa <b>password akun Anda telah berhasil diubah</b>.
        </p>

        <p>
          Jika Anda <b>tidak merasa melakukan perubahan ini</b>,
          segera hubungi admin atau lakukan reset password.
        </p>

        <hr />

        <p style="font-size:12px;color:#666">
          Email ini dikirim otomatis ke <b>${email}</b>.<br/>
          Mohon jangan membalas email ini.
        </p>

        <p style="font-size:12px;color:#666">
          © ${new Date().getFullYear()} BPOM Magang
        </p>
      </div>
    `,
  };
};
