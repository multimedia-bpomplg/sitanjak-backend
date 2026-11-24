import { Request, Response } from "express";
import User from "../models/User";
import Role from "../models/Role";
import Pendaftaran from "../models/pendaftaran";
import { resolveKategoriMagang } from "../utils/pesertaKategori";

/* ================= GET PESERTA DISETUJUI (SUPERADMIN) ================= */
export const getPesertaDisetujui = async (req: any, res: Response) => {
  try {
    // Ambil semua pendaftaran yang disetujui
    const pendaftaranList = await Pendaftaran.find({
      status: "Disetujui",
    }).populate("peserta.mentor", "name email posisiMentor");

    // Flatten data peserta
    const allPeserta = pendaftaranList.flatMap((pendaftaran) =>
      pendaftaran.peserta.map((p: any) => ({
        pendaftaranId: pendaftaran._id,
        pesertaId: p._id,
        nama: p.nama,
        email: p.email,
        wa: p.wa,
        posisi: p.posisi,
        jurusan: p.jurusan,
        asal: p.asal
          ? {
              jenis: p.asal.jenis || "",
              nama: p.asal.nama || "",
            }
          : null,
        jenisKelamin: p.jenisKelamin,
        tempatLahir: p.tempatLahir,
        tanggalLahir: p.tanggalLahir,
        provinsi: p.provinsi,
        kota: p.kota,
        kecamatan: p.kecamatan,
        kelurahan: p.kelurahan,
        alamatLengkap: p.alamatLengkap,
        kategoriMagang: resolveKategoriMagang(p.jurusan, p.kategoriMagang),
        kategori: pendaftaran.kategori,
        mentor: p.mentor,
        // ✅ INI YANG KURANG (PENTING)
        statusMagang: p.statusMagang || "Menunggu",
        isTerdaftar: p.isTerdaftar || false,
        tanggalMulaiMagang: p.tanggalMulaiMagang,
        tanggalSelesaiMagang: p.tanggalSelesaiMagang,
        createdAt: pendaftaran.createdAt,
      })),
    );

    res.json(allPeserta);
  } catch (err) {
    console.error("[GET PESERTA DISETUJUI]", err);
    res.status(500).json({ message: "Gagal mengambil data peserta" });
  }
};
