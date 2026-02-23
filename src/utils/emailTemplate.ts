export const pesertaEmailTemplate = ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) => {
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Akun Magang BPOM</title>
</head>

<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:30px 0;">
<tr>
<td align="center">

<!-- Card -->
<table width="560" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background:#2563eb;padding:28px;text-align:center;color:white;">
  <h1 style="margin:0;font-size:22px;">
    🎉 Akun Magang Berhasil Dibuat
  </h1>
  <p style="margin:8px 0 0;font-size:14px;">
    Sistem Informasi Manajemen Magang BPOM
  </p>
</td>
</tr>

<!-- Content -->
<tr>
<td style="padding:32px;color:#0f172a;">

<p style="margin:0 0 16px;font-size:15px;">
Halo <strong>${name}</strong> 👋,
</p>

<p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
Selamat! Akun magang Anda telah berhasil dibuat.
Berikut adalah informasi akun yang dapat Anda gunakan.
</p>

<!-- Info Box -->
<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:24px;">

<tr>
<td>

<p style="margin:0 0 10px;font-size:13px;color:#64748b;">
📄 Detail Akun
</p>

<table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;">

<tr>
<td width="120"><strong>Nama</strong></td>
<td>: ${name}</td>
</tr>

<tr>
<td><strong>Email</strong></td>
<td>: ${email}</td>
</tr>

<tr>
<td><strong>Password</strong></td>
<td>: ${password}</td>
</tr>

</table>

</td>
</tr>
</table>

<!-- Security Warning -->
<table width="100%" cellpadding="0" cellspacing="0"
style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:24px;">

<tr>
<td>

<p style="margin:0 0 8px;font-weight:bold;color:#92400e;">
🔐 Keamanan Akun
</p>

<p style="margin:0;font-size:13px;line-height:1.6;color:#b45309;">
Demi keamanan akun Anda, segera ubah password setelah login pertama kali
dan jangan bagikan informasi ini kepada pihak lain.
</p>

</td>
</tr>
</table>

<!-- Info -->
<p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
Jika mengalami kendala saat mengakses akun,
silakan hubungi administrator sistem.
</p>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="background:#020617;padding:22px;text-align:center;color:#94a3b8;">

<p style="margin:0 0 6px;font-size:12px;">
© ${year} Badan Pengawas Obat dan Makanan
</p>

<p style="margin:0;font-size:11px;">
Sistem Informasi Manajemen Magang
</p>

<p style="margin:8px 0 0;font-size:11px;color:#64748b;">
Email ini dikirim otomatis. Mohon tidak membalas email ini.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};
