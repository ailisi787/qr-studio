import QRCode from "qrcode";

export const ECC_LEVELS = [
  {
    id: "L",
    name: "低",
    recovery: "约 7%",
    hint: "容量最大，适合干净打印",
  },
  {
    id: "M",
    name: "中",
    recovery: "约 15%",
    hint: "日常使用的推荐等级",
  },
  {
    id: "Q",
    name: "较高",
    recovery: "约 25%",
    hint: "适合可能磨损的场景",
  },
  {
    id: "H",
    name: "高",
    recovery: "约 30%",
    hint: "最耐污损，容量最小",
  },
] as const;

export type EccLevel = (typeof ECC_LEVELS)[number]["id"];

export const COLOR_PRESETS = [
  { id: "classic", name: "经典", fg: "#1C1A16", bg: "#FFFAF2" },
  { id: "ink", name: "墨蓝", fg: "#1B3148", bg: "#F4F1EA" },
  { id: "slate", name: "石板", fg: "#22262B", bg: "#EEF1F3" },
] as const;

export const SIZE_MIN = 128;
export const SIZE_MAX = 1024;
export const SIZE_STEP = 8;
export const DEFAULT_SIZE = 256;
export const PREVIEW_SIZE = 360;

export const HEX_PATTERN = /^#?([0-9A-Fa-f]{6})$/;

export function normalizeHex(raw: string): string | null {
  const match = raw.trim().match(HEX_PATTERN);
  if (!match) return null;
  return `#${match[1]!.toUpperCase()}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (channel: number) => {
    const scaled = channel / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: string, b: string): number | null {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return null;
  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const [hi, lo] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastWarning = "low" | "fail" | null;

export function contrastWarning(fg: string, bg: string): ContrastWarning {
  const ratio = contrastRatio(fg, bg);
  if (ratio === null) return null;
  if (ratio < 2) return "fail";
  if (ratio < 4.5) return "low";
  return null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function downloadFilename(text: string): string {
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      const host = url.hostname.replace(/^www\./, "");
      if (host) return `qr-${host}.png`;
    }
  } catch {
    // Fall through to a slug from the raw text.
  }
  const slug = trimmed
    .slice(0, 24)
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `qr-${slug}.png` : "qr-code.png";
}

export type QrRenderOptions = {
  size: number;
  fg: string;
  bg: string;
  ecc: EccLevel;
  margin?: number;
};

export async function renderQrDataUrl(
  text: string,
  options: QrRenderOptions,
): Promise<string> {
  const fg = normalizeHex(options.fg) ?? "#000000";
  const bg = normalizeHex(options.bg) ?? "#FFFFFF";
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: options.ecc,
    width: options.size,
    margin: options.margin ?? 2,
    color: { dark: fg, light: bg },
    type: "image/png",
  });
}

export async function downloadQrPng(
  text: string,
  filename: string,
  options: QrRenderOptions,
): Promise<void> {
  const dataUrl = await renderQrDataUrl(text, options);
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export type QrSettings = {
  text: string;
  fg: string;
  bg: string;
  size: number;
  ecc: EccLevel;
};

const STORAGE_KEY = "qr-studio-v1";

export const DEFAULT_SETTINGS: QrSettings = {
  text: "",
  fg: COLOR_PRESETS[0].fg,
  bg: COLOR_PRESETS[0].bg,
  size: DEFAULT_SIZE,
  ecc: "M",
};

export function loadSettings(): QrSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<QrSettings>;
    const ecc = ECC_LEVELS.some((level) => level.id === parsed.ecc)
      ? (parsed.ecc as EccLevel)
      : DEFAULT_SETTINGS.ecc;
    const size =
      typeof parsed.size === "number"
        ? Math.min(
            SIZE_MAX,
            Math.max(SIZE_MIN, Math.round(parsed.size / SIZE_STEP) * SIZE_STEP),
          )
        : DEFAULT_SETTINGS.size;
    return {
      text: typeof parsed.text === "string" ? parsed.text.slice(0, 4000) : "",
      fg: normalizeHex(parsed.fg ?? "") ?? DEFAULT_SETTINGS.fg,
      bg: normalizeHex(parsed.bg ?? "") ?? DEFAULT_SETTINGS.bg,
      size,
      ecc,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: QrSettings): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...settings, text: settings.text.slice(0, 4000) }),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}
