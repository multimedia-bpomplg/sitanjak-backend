export const mentorEmailTemplate = ({
  name,
  email,
  password,
  role,
  pesertaBimbingan,
}: {
  name: string;
  email: string;
  password: string;
  role: string;
  pesertaBimbingan: string[];
}) => {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6">
    <h2>Halo ${name},</h2>

    <p>
      Akun <b>${role}</b> Anda pada Sistem Magang BPOM telah berhasil dibuat.
    </p>

    <hr />

    <h3>Informasi Akun</h3>
    <ul>
      <li><b>Nama</b> : ${name}</li>
      <li><b>Email</b> : ${email}</li>
      <li><b>Password</b> : ${password}</li>
      <li><b>Role</b> : ${role}</li>
    </ul>

    <h3>Peserta yang Dibimbing</h3>
    ${
      pesertaBimbingan.length > 0
        ? `<ul>
            ${pesertaBimbingan.map((p) => `<li>${p}</li>`).join("")}
          </ul>`
        : `<p>- Belum ditentukan -</p>`
    }

    <br />
    <p>
      Demi keamanan akun, silakan segera login dan mengganti password Anda.
    </p>

    <p>
      Jika terdapat kendala, silakan hubungi admin.
    </p>

    <br />
    <p>Hormat kami,</p>
    <b>Tim Magang BPOM</b>
  </div>
  `;
};
