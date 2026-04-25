// Stable color palettes for occupation, training type, German level, and content
// category badges. Each function returns a Tailwind utility string that overrides
// the Badge component's default variant colors via tailwind-merge.

const SOFT_PALETTE = [
  // 0: cyan
  "bg-cyan-500/20 text-cyan-700 border-cyan-500/55 dark:bg-cyan-400/15 dark:text-cyan-200 dark:border-cyan-400/40",
  // 1: blue
  "bg-blue-500/20 text-blue-700 border-blue-500/55 dark:bg-blue-400/15 dark:text-blue-200 dark:border-blue-400/40",
  // 2: violet
  "bg-violet-500/20 text-violet-700 border-violet-500/55 dark:bg-violet-400/15 dark:text-violet-200 dark:border-violet-400/40",
  // 3: fuchsia
  "bg-fuchsia-500/20 text-fuchsia-700 border-fuchsia-500/55 dark:bg-fuchsia-400/15 dark:text-fuchsia-200 dark:border-fuchsia-400/40",
  // 4: pink
  "bg-pink-500/20 text-pink-700 border-pink-500/55 dark:bg-pink-400/15 dark:text-pink-200 dark:border-pink-400/40",
  // 5: rose
  "bg-rose-500/20 text-rose-700 border-rose-500/55 dark:bg-rose-400/15 dark:text-rose-200 dark:border-rose-400/40",
  // 6: amber
  "bg-amber-500/25 text-amber-800 border-amber-500/55 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/40",
  // 7: emerald
  "bg-emerald-500/20 text-emerald-700 border-emerald-500/55 dark:bg-emerald-400/15 dark:text-emerald-200 dark:border-emerald-400/40",
  // 8: lime
  "bg-lime-500/25 text-lime-800 border-lime-500/55 dark:bg-lime-400/15 dark:text-lime-200 dark:border-lime-400/40",
  // 9: teal
  "bg-teal-500/20 text-teal-700 border-teal-500/55 dark:bg-teal-400/15 dark:text-teal-200 dark:border-teal-400/40",
  // 10: sky
  "bg-sky-500/20 text-sky-700 border-sky-500/55 dark:bg-sky-400/15 dark:text-sky-200 dark:border-sky-400/40",
  // 11: indigo
  "bg-indigo-500/20 text-indigo-700 border-indigo-500/55 dark:bg-indigo-400/15 dark:text-indigo-200 dark:border-indigo-400/40",
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

const OCCUPATION_INDEX: Record<string, number> = {
  "Điều dưỡng": 1,            // blue — care
  "Cơ điện tử": 0,             // cyan — tech
  "Nhà hàng-Khách sạn": 6,     // amber — hospitality
  "Bán lẻ": 4,                 // pink — retail
  IT: 2,                       // violet — IT
  "Y tế kỹ thuật": 9,          // teal — med-tech
  "Cơ khí": 11,                // indigo — engineering
  "Đầu bếp": 5,                // rose — culinary
};

export function occupationColor(name: string): string {
  const idx = OCCUPATION_INDEX[name] ?? hashIndex(name, SOFT_PALETTE.length);
  return SOFT_PALETTE[idx];
}

export function trainingTypeColor(t: string): string {
  // Dual = blue, Schulisch = violet
  if (t === "Dual") return SOFT_PALETTE[1];
  if (t === "Schulisch") return SOFT_PALETTE[2];
  return SOFT_PALETTE[hashIndex(t, SOFT_PALETTE.length)];
}

// A1 → C2: emerald → teal → cyan → blue → violet → fuchsia
// Each level gets a distinctly different hue and slightly stronger saturation
// so the visual progression reads "easier → harder" left to right.
const LEVEL_PALETTE: Record<string, string> = {
  A1: "bg-emerald-500/20 text-emerald-700 border-emerald-500/55 dark:bg-emerald-400/15 dark:text-emerald-200 dark:border-emerald-400/45 font-semibold",
  A2: "bg-teal-500/25 text-teal-700 border-teal-500/60 dark:bg-teal-400/20 dark:text-teal-200 dark:border-teal-400/50 font-semibold",
  B1: "bg-cyan-500/30 text-cyan-700 border-cyan-500/60 dark:bg-cyan-400/20 dark:text-cyan-200 dark:border-cyan-400/55 font-semibold",
  B2: "bg-blue-500/30 text-blue-700 border-blue-500/60 dark:bg-blue-400/20 dark:text-blue-200 dark:border-blue-400/55 font-semibold",
  C1: "bg-violet-500/30 text-violet-700 border-violet-500/65 dark:bg-violet-400/20 dark:text-violet-200 dark:border-violet-400/55 font-semibold",
  C2: "bg-fuchsia-500/30 text-fuchsia-700 border-fuchsia-500/65 dark:bg-fuchsia-400/20 dark:text-fuchsia-200 dark:border-fuchsia-400/55 font-semibold",
};

export function levelColor(level: string): string {
  return LEVEL_PALETTE[level] ?? LEVEL_PALETTE.B1;
}

// News & community categories — solid backgrounds so they stay readable when
// rendered on top of cover photos.
const CATEGORY_PALETTE: Record<string, string> = {
  // News — explicit dark:text-* so the Badge variant's default dark text color
  // (e.g. dark:text-cyan-300) doesn't leak through tailwind-merge.
  "Chính sách":
    "bg-blue-600 text-white border-blue-500 shadow-sm dark:bg-blue-500 dark:text-white dark:border-blue-300",
  "Thị trường":
    "bg-cyan-600 text-white border-cyan-500 shadow-sm dark:bg-cyan-500 dark:text-white dark:border-cyan-300",
  "Kinh nghiệm":
    "bg-violet-600 text-white border-violet-500 shadow-sm dark:bg-violet-500 dark:text-white dark:border-violet-300",
  "Học bổng":
    "bg-emerald-600 text-white border-emerald-500 shadow-sm dark:bg-emerald-500 dark:text-white dark:border-emerald-300",
  "Tài trợ":
    "bg-amber-500 text-amber-950 border-amber-400 shadow-sm dark:bg-amber-400 dark:text-amber-950 dark:border-amber-300",
  // Community
  "Hỏi đáp":
    "bg-fuchsia-600 text-white border-fuchsia-500 shadow-sm dark:bg-fuchsia-500 dark:text-white dark:border-fuchsia-300",
  "Hồ sơ":
    "bg-indigo-600 text-white border-indigo-500 shadow-sm dark:bg-indigo-500 dark:text-white dark:border-indigo-300",
  "Việc làm":
    "bg-rose-600 text-white border-rose-500 shadow-sm dark:bg-rose-500 dark:text-white dark:border-rose-300",
  "Thông báo":
    "bg-amber-600 text-amber-50 border-amber-500 shadow-sm dark:bg-amber-500 dark:text-amber-950 dark:border-amber-300",
};

export function categoryColor(cat: string): string {
  return (
    CATEGORY_PALETTE[cat] ??
    "bg-cyan-600 text-white border-cyan-500 shadow-sm dark:bg-cyan-500 dark:text-white dark:border-cyan-300"
  );
}
