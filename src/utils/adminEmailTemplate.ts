export const adminEmailTemplate = ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) => {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6">
    <h2>Halo ${name},</h2>

    <p>
      Akun <b>Admin</b> Anda pada Sistem Magang BPOM telah berhasil dibuat.
    </p>

    <hr />

    <h3>Informasi Akun</h3>
    <ul>
      <li><b>Nama</b> : ${name}</li>
      <li><b>Email</b> : ${email}</li>
      <li><b>Password</b> : ${password}</li>
      <li><b>Role</b> : Admin</li>
    </ul>

    <p>
      Demi keamanan akun, silakan segera login dan mengganti password Anda.
    </p>

    <br />
    <p>Hormat kami,</p>
    <b>Tim Magang BPOM</b>
  </div>
  `;
};
