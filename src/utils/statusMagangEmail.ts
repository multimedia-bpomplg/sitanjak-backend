/* ============================================
   STATUS MAGANG EMAIL TEMPLATES
   BPOM Internship System
============================================ */

type DiterimaParams = {
  name: string;
  email: string;
  posisi: string;
  tanggalMulai: string;
  tanggalSelesai: string;
};

type DitolakParams = {
  name: string;
  email: string;
  alasan?: string;
};

/* ===============================
   EMAIL: DITERIMA MAGANG
================================ */
export const diterimaMagangEmail = ({
  name,
  email,
  posisi,
  tanggalMulai,
}: DiterimaParams) => {
  const year = new Date().getFullYear();

  return {
    subject: "🎉 Selamat! Anda Diterima Program Magang BPOM",

    html: `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Diterima Magang</title>
</head>

<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
<tr>
<td align="center">

<table width="560" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.08);">

<tr>
<td style="background:#16a34a;padding:28px;text-align:center;color:white;">
  <h1 style="margin:0;font-size:22px;">🎉 Selamat!</h1>
  <p style="margin:8px 0 0;font-size:14px;">
    Anda Diterima Program Magang BPOM
  </p>
</td>
</tr>

<tr>
<td style="padding:32px;color:#0f172a;">

<p>Halo <strong>${name}</strong> 👋,</p>

<p>
Dengan senang hati kami informasikan bahwa Anda
<b>DITERIMA</b> sebagai peserta magang BPOM.
</p>

<table width="100%" cellpadding="6" cellspacing="0"
style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;margin-bottom:24px;">

<tr>
<td><strong>Posisi</strong></td>
<td>: ${posisi}</td>
</tr>

<tr>
<td><strong>Tanggal Mulai</strong></td>
<td>: ${tanggalMulai}</td>
</tr>

<tr>
<td><strong>Email</strong></td>
<td>: ${email}</td>
</tr>

</table>

<p>
Silakan mempersiapkan diri dan mengikuti arahan selanjutnya.
</p>

</td>
</tr>

<tr>
<td style="background:#020617;padding:22px;text-align:center;color:#94a3b8;">
<p style="font-size:12px;">© ${year} BPOM</p>
<p style="font-size:11px;">Sistem Informasi Magang</p>
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

/* ===============================
   EMAIL: DITOLAK MAGANG
================================ */
export const ditolakMagangEmail = ({ name, email, alasan }: DitolakParams) => {
  const year = new Date().getFullYear();

  return {
    subject: "📢 Informasi Hasil Seleksi Magang BPOM",

    html: `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Hasil Seleksi</title>
</head>

<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
<tr>
<td align="center">

<table width="560" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.08);">

<tr>
<td style="background:#dc2626;padding:28px;text-align:center;color:white;">
  <h1 style="margin:0;font-size:22px;">📢 Hasil Seleksi</h1>
  <p style="margin:8px 0 0;font-size:14px;">
    Program Magang BPOM
  </p>
</td>
</tr>

<tr>
<td style="padding:32px;color:#0f172a;">

<p>Halo <strong>${name}</strong>,</p>

<p>
Terima kasih telah mengikuti seleksi magang BPOM.
Saat ini Anda <b>belum dapat kami terima</b>.
</p>

${
  alasan
    ? `
<table width="100%" cellpadding="6" cellspacing="0"
style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:24px;">
<tr>
<td>
<p style="color:#991b1b;"><strong>Catatan Evaluasi:</strong></p>
<p>${alasan}</p>
</td>
</tr>
</table>
`
    : ""
}

<p>
Kami mendorong Anda untuk mencoba kembali di periode berikutnya.
</p>

</td>
</tr>

<tr>
<td style="background:#020617;padding:22px;text-align:center;color:#94a3b8;">
<p style="font-size:12px;">© ${year} BPOM</p>
<p style="font-size:11px;">Sistem Informasi Magang</p>
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
