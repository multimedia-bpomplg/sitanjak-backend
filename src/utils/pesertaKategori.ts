import Pendaftaran from "../models/pendaftaran";

export type KategoriMagang = "PKPA" | "Reguler";

export const PKPA_JURUSAN_LABEL = "Profesi Apoteker / PKPA";

export function isPkpaJurusan(jurusan?: string | null): boolean {
  if (!jurusan) return false;
  const normalized = jurusan.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "profesi apoteker / pkpa" ||
    normalized.includes("profesi apoteker") ||
    normalized.includes("pkpa")
  );
}

export function resolveKategoriMagang(
  jurusan?: string | null,
  explicitKategori?: string | null,
): KategoriMagang {
  if (explicitKategori === "PKPA") return "PKPA";
  if (isPkpaJurusan(jurusan)) return "PKPA";
  return "Reguler";
}

export async function resolveUserMagangMeta(
  user: {
    email?: string;
    jurusan?: string;
    kategoriMagang?: string;
  },
  roleNames: string[],
): Promise<{ jurusan: string; kategoriMagang: KategoriMagang }> {
  let jurusan = user.jurusan || "";
  let kategoriMagang = resolveKategoriMagang(jurusan, user.kategoriMagang);

  if (
    kategoriMagang !== "PKPA" &&
    roleNames.includes("peserta") &&
    !jurusan &&
    user.email
  ) {
    const escaped = user.email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pendaftaran = await Pendaftaran.findOne({
      "peserta.email": { $regex: new RegExp(`^${escaped}$`, "i") },
    })
      .sort({ createdAt: -1 })
      .select("peserta.email peserta.jurusan peserta.kategoriMagang")
      .lean();

    const matched = pendaftaran?.peserta?.find(
      (p: any) =>
        p.email?.trim().toLowerCase() === user.email!.trim().toLowerCase(),
    );

    if (matched) {
      jurusan = matched.jurusan || "";
      kategoriMagang = resolveKategoriMagang(
        jurusan,
        (matched as any).kategoriMagang,
      );
    }
  }

  return { jurusan, kategoriMagang };
}
