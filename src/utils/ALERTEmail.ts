export const passwordChangedEmail = (nama: string, email: string) => {
  const currentTime = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "short",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    subject: "🔐 Password Akun Berhasil Diperbarui | BPOM Magang",

    html: `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Password Berhasil Diubah</title>
</head>

<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:30px 0;">
<tr>
<td align="center">

<!-- Card -->
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background:#10b981;padding:32px;text-align:center;color:white;">
  <h1 style="margin:0;font-size:24px;">🔐 Password Berhasil Diubah</h1>
  <p style="margin:8px 0 0;font-size:14px;">
    Keamanan akun Anda telah diperbarui
  </p>
</td>
</tr>

<!-- Content -->
<tr>
<td style="padding:32px;color:#0f172a;">

<p style="margin:0 0 16px;font-size:15px;">
Halo <strong>${nama}</strong>,
</p>

<p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
Kami menginformasikan bahwa password akun Anda berhasil diperbarui.
Jika ini memang Anda lakukan, tidak diperlukan tindakan lebih lanjut.
</p>

<!-- Info Box -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:24px;">
<tr>
<td>

<p style="margin:0 0 8px;font-size:13px;color:#64748b;">
🕒 Waktu Perubahan
</p>

<p style="margin:0;font-size:14px;font-weight:bold;">
${currentTime} WIB
</p>

</td>
</tr>
</table>

<!-- Warning -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:24px;">
<tr>
<td>

<p style="margin:0 0 8px;font-weight:bold;color:#92400e;">
⚠️ Tidak Melakukan Perubahan Ini?
</p>

<p style="margin:0;font-size:13px;line-height:1.6;color:#b45309;">
Segera ganti password dan hubungi admin jika Anda merasa aktivitas ini mencurigakan.
</p>

</td>
</tr>
</table>


<!-- Email Info -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:12px;padding:16px;">
<tr>
<td>

<p style="margin:0 0 6px;font-size:13px;color:#475569;">
📧 Email Tujuan
</p>

<p style="margin:0;font-size:13px;">
<strong>${email}</strong>
</p>

<p style="margin:6px 0 0;font-size:11px;color:#64748b;">
Email ini dikirim otomatis. Mohon tidak membalas.
</p>

</td>
</tr>
</table>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="background:#020617;padding:24px;text-align:center;color:#94a3b8;">

<p style="margin:0 0 6px;font-size:12px;">
© ${new Date().getFullYear()} BPOM Magang
</p>

<p style="margin:0;font-size:11px;">
Sistem Informasi Manajemen Magang
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
  };
};
