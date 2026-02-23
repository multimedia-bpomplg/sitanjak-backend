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
  <!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Akun Admin BPOM</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <!-- Container Utama -->
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
      
      <!-- Header dengan Gradient -->
      <div style="background: linear-gradient(135deg, #7F1D1D 0%, #B91C1C 50%, #F59E0B 100%); padding: 40px 30px; text-align: center;">
        <div style="width: 80px; height: 80px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border: 3px solid rgba(255,255,255,0.3);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="white"/>
          </svg>
        </div>
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Selamat Datang, Admin!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Akun Anda telah berhasil dibuat di Sistem Magang BPOM</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 40px 30px;">
        <!-- Pesan Sambutan -->
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
          <p style="margin: 0; color: #92400E; font-size: 15px; line-height: 1.6;">
            <strong style="display: block; margin-bottom: 8px;">Halo ${name},</strong>
            Terima kasih telah bergabung dengan Sistem Magang BPOM. Berikut adalah informasi akun Anda yang telah kami siapkan.
          </p>
        </div>

        <!-- Kartu Informasi Akun -->
        <div style="background: linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%); border-radius: 16px; padding: 25px; margin-bottom: 30px;">
          <h3 style="color: #1F2937; margin: 0 0 20px; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 8px; height: 8px; background-color: #F59E0B; border-radius: 50%;"></span>
            Detail Akun Anda
          </h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #D1D5DB;">
                <span style="color: #6B7280; font-size: 14px;">Nama Lengkap</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #D1D5DB; text-align: right;">
                <strong style="color: #1F2937; font-size: 15px;">${name}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #D1D5DB;">
                <span style="color: #6B7280; font-size: 14px;">Email</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #D1D5DB; text-align: right;">
                <strong style="color: #1F2937; font-size: 15px;">${email}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #D1D5DB;">
                <span style="color: #6B7280; font-size: 14px;">Password</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #D1D5DB; text-align: right;">
                <code style="background-color: #1F2937; color: #F59E0B; padding: 6px 12px; border-radius: 8px; font-size: 14px; letter-spacing: 1px;">${password}</code>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="color: #6B7280; font-size: 14px;">Role</span>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="background: linear-gradient(135deg, #7F1D1D, #B91C1C); color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">Admin</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Kartu Keamanan -->
        <div style="background-color: #EFF6FF; border-radius: 16px; padding: 20px; margin-bottom: 30px; border: 1px solid #BFDBFE;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="width: 40px; height: 40px; background-color: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="white"/>
              </svg>
            </div>
            <div style="flex: 1;">
              <h4 style="color: #1E40AF; margin: 0 0 8px; font-size: 16px; font-weight: 600;">Tips Keamanan Akun</h4>
              <ul style="margin: 0; padding-left: 20px; color: #2563EB;">
                <li style="margin-bottom: 6px; font-size: 14px;">Segera ganti password setelah login pertama</li>
                <li style="margin-bottom: 6px; font-size: 14px;">Jangan bagikan password kepada siapapun</li>
                <li style="margin-bottom: 6px; font-size: 14px;">Gunakan password yang kuat dan unik</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Tombol Aksi -->
        <div style="text-align: center; margin: 35px 0 25px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login" 
             style="display: inline-block; background: linear-gradient(135deg, #7F1D1D 0%, #B91C1C 50%, #F59E0B 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 20px rgba(185, 28, 28, 0.3); transition: all 0.3s ease;">
            🚀 Login ke Dashboard
          </a>
        </div>

        <!-- Informasi Tambahan -->
        <div style="background-color: #F3F4F6; border-radius: 12px; padding: 20px; margin-top: 30px;">
          <p style="margin: 0 0 10px; color: #4B5563; font-size: 14px;">
            <strong>📌 Catatan Penting:</strong>
          </p>
          <p style="margin: 0; color: #6B7280; font-size: 13px; line-height: 1.6;">
            Email ini dikirim secara otomatis oleh sistem. Harap jangan membalas email ini. 
            Jika Anda merasa tidak mendaftar sebagai admin, segera hubungi tim support kami.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #1F2937; padding: 30px; text-align: center;">
        <div style="margin-bottom: 20px;">
          <img src="https://upload.wikimedia.org/wikipedia/id/3/3b/Logo_BPOM_2019.png" alt="BPOM Logo" style="height: 40px; width: auto; opacity: 0.9;">
        </div>
        <p style="color: #9CA3AF; margin: 0 0 10px; font-size: 13px;">
          Badan Pengawas Obat dan Makanan Republik Indonesia
        </p>
        <p style="color: #6B7280; margin: 0 0 15px; font-size: 12px;">
          Jl. Percetakan Negara No.23, Jakarta Pusat 10560
        </p>
        <div style="border-top: 1px solid #374151; padding-top: 20px;">
          <p style="color: #6B7280; margin: 0; font-size: 12px;">
            © ${new Date().getFullYear()} Sistem Magang BPOM. All rights reserved.
          </p>
          <div style="margin-top: 15px;">
            <a href="#" style="color: #9CA3AF; text-decoration: none; margin: 0 10px; font-size: 12px;">Kebijakan Privasi</a>
            <span style="color: #374151;">|</span>
            <a href="#" style="color: #9CA3AF; text-decoration: none; margin: 0 10px; font-size: 12px;">Syarat & Ketentuan</a>
            <span style="color: #374151;">|</span>
            <a href="#" style="color: #9CA3AF; text-decoration: none; margin: 0 10px; font-size: 12px;">Bantuan</a>
          </div>
        </div>
      </div>
    </div>

    <!-- View in Browser -->
    <div style="max-width: 600px; margin: 20px auto; text-align: center;">
      <p style="color: rgba(255,255,255,0.7); font-size: 12px;">
        Tidak bisa melihat email dengan baik? 
        <a href="#" style="color: white; text-decoration: underline;">Klik di sini</a>
      </p>
    </div>
  </body>
  </html>
  `;
};
