export function normalizeFormasiKey(value?: string | null): string {
  if (!value) return "";
  const lower = value.trim().toLowerCase();
  if (!lower) return "";
  if (lower.includes("tata usaha")) return "tata_usaha";
  if (lower.includes("penindakan")) return "penindakan";
  if (lower.includes("pengujian")) return "pengujian";
  if (lower.includes("pemeriksaan") || lower.includes("inspeksi")) {
    return "pemeriksaan";
  }
  if (
    lower.includes("informasi") ||
    lower.includes("komunikasi") ||
    lower.includes("infokom")
  ) {
    return "infokom";
  }
  return lower;
}

export function isMatchingMentorFormasi(
  pesertaPosisi?: string | null,
  mentorPosisi?: string | null,
): boolean {
  const pesertaKey = normalizeFormasiKey(pesertaPosisi);
  const mentorKey = normalizeFormasiKey(mentorPosisi);
  if (!pesertaKey || !mentorKey) return false;
  return pesertaKey === mentorKey;
}
