export const laporanStatusEmailTemplate = (data: {
  pesertaName: string;
  bulan: string;
  status: string;
  catatanMentor: string;
  mentorName: string;
}) => {
  const statusConfig: Record<string, { title: string; color: string }> = {
    Disetujui: { title: "Laporan Disetujui ✅", color: "#10B981" },
    Ditolak: { title: "Laporan Ditolak ❌", color: "#EF4444" },
    Perbaiki: { title: "Perlu Perbaikan 🔧", color: "#3B82F6" },
  };

  const config = statusConfig[data.status] || {
    title: "Update Laporan",
    color: "#6B7280",
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Update Laporan Bulanan</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 40px; text-align: center; }
        .content { padding: 40px; color: #374151; }
        .status-box { background-color: ${config.color}15; border: 2px solid ${config.color}; border-radius: 12px; padding: 20px; margin: 25px 0; }
        .note-box { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 24px; background-color: ${config.color}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Update Status Laporan Bulanan</h1>
          <p>Sistem Magang Digital</p>
        </div>
        
        <div class="content">
          <p>Halo <strong>${data.pesertaName}</strong>,</p>
          
          <p>Mentor Anda, <strong>${data.mentorName}</strong>, telah memberikan penilaian untuk laporan bulanan Anda:</p>
          
          <div class="status-box">
            <h2 style="margin-top: 0; color: ${config.color};">${config.title}</h2>
            <p><strong>Bulan:</strong> ${data.bulan}</p>
            <p><strong>Status:</strong> <span style="color: ${config.color}; font-weight: bold;">${data.status}</span></p>
          </div>
          
          <div class="note-box">
            <h3 style="margin-top: 0; color: #92400e;">📝 Catatan dari Mentor</h3>
            <p style="white-space: pre-line;">${data.catatanMentor}</p>
          </div>
          
          <p>Silakan login ke dashboard magang untuk:</p>
          <ul>
            <li>Melihat detail penilaian</li>
            ${data.status === "Perbaiki" ? "<li>Melakukan perbaikan laporan</li>" : ""}
            <li>Melanjutkan pengisian laporan berikutnya</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="[URL_DASHBOARD]" class="button">📋 Buka Dashboard Magang</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            <em>Email ini dikirim otomatis dari Sistem Magang Digital.</em>
          </p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Sistem Magang Digital. All rights reserved.</p>
          <p>Jika Anda memiliki pertanyaan, hubungi administrator sistem.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
