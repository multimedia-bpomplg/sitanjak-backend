export const pesertaEmailTemplate = ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) => {
  return `
    <div style="font-family: Arial; line-height: 1.6">
      <h2>Halo ${name} 👋</h2>

      <p>
        Akun magang Anda telah <b>berhasil dibuat</b>.
        Berikut adalah detail akun Anda:
      </p>

      <table cellpadding="6">
        <tr>
          <td><b>Nama</b></td>
          <td>: ${name}</td>
        </tr>
        
        <tr>
          <td><b>Email</b></td>
          <td>: ${email}</td>
        </tr>
        <tr>
          <td><b>Password</b></td>
          <td>: ${password}</td>
        </tr>
      </table>

      <p style="margin-top: 16px">
        Silakan login dan segera ganti password Anda demi keamanan akun.
      </p>

      <hr />
      <small>
        Email ini dikirim secara otomatis. Jangan membalas email ini.
      </small>
    </div>
  `;
};
