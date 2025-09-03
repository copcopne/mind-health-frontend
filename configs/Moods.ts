export type MoodCode = "VERY_BAD" | "BAD" | "NORMAL" | "GOOD" | "EXCELLENT";
export type LegacyMoodCode =
  | "NEGATIVE"
  | "SLIGHTLY_NEGATIVE"
  | "NEUTRAL"
  | "SLIGHTLY_POSITIVE"
  | "POSITIVE";

export const MOOD_OPTIONS: Array<{
  code: MoodCode;
  label: string;
  emoji: string;
  color: string;
}> = [
  { code: "VERY_BAD", label: "Rất tệ",       emoji: "😣", color: "#e74c3c" },
  { code: "BAD",      label: "Tệ",           emoji: "😞", color: "#e67e22" },
  { code: "NORMAL",   label: "Bình thường",  emoji: "😐", color: "#7f8c8d" },
  { code: "GOOD",     label: "Ổn",           emoji: "🙂", color: "#27ae60" },
  { code: "EXCELLENT",label: "Tuyệt",        emoji: "🤩", color: "#16a085" },
];

export const moodMetaByCode: Record<MoodCode, { label: string; emoji: string; color: string }> =
  MOOD_OPTIONS.reduce((acc, m) => {
    acc[m.code] = { label: m.label, emoji: m.emoji, color: m.color };
    return acc;
  }, {} as any);

// Map các code cũ (nếu backend/lịch sử dữ liệu còn dùng)
export const normalizeMood = (
  raw?: string | null
): MoodCode | null => {
  if (!raw) return null;
  const up = String(raw).toUpperCase();

  // đã đúng chuẩn
  if (["VERY_BAD","BAD","NORMAL","GOOD","EXCELLENT"].includes(up)) return up as MoodCode;

  // legacy → new
  const legacyMap: Record<LegacyMoodCode, MoodCode> = {
    NEGATIVE: "VERY_BAD",
    SLIGHTLY_NEGATIVE: "BAD",
    NEUTRAL: "NORMAL",
    SLIGHTLY_POSITIVE: "GOOD",
    POSITIVE: "EXCELLENT",
  };
  return (legacyMap as any)[up] ?? null;
};
