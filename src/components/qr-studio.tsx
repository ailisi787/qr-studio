import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  Download,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  COLOR_PRESETS,
  contrastWarning,
  DEFAULT_SETTINGS,
  downloadFilename,
  downloadQrPng,
  ECC_LEVELS,
  type EccLevel,
  isHttpUrl,
  loadSettings,
  normalizeHex,
  PREVIEW_SIZE,
  renderQrDataUrl,
  saveSettings,
  SIZE_MAX,
  SIZE_MIN,
  SIZE_STEP,
} from "@/lib/qr";
import { cn } from "@/lib/utils";

const EXAMPLE_URL = "https://example.com";

export function QrStudio() {
  const formId = useId();
  const contentId = `${formId}-content`;
  const contentHintId = `${formId}-content-hint`;
  const eccHintId = `${formId}-ecc-hint`;
  const sizeLabelId = `${formId}-size`;
  const sizeValueId = `${formId}-size-value`;
  const contrastId = `${formId}-contrast`;
  const previewStatusId = `${formId}-preview-status`;

  const [text, setText] = useState(DEFAULT_SETTINGS.text);
  const [fg, setFg] = useState(DEFAULT_SETTINGS.fg);
  const [bg, setBg] = useState(DEFAULT_SETTINGS.bg);
  const [size, setSize] = useState(DEFAULT_SETTINGS.size);
  const [ecc, setEcc] = useState<EccLevel>(DEFAULT_SETTINGS.ecc);
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const downloadTimer = useRef<number | null>(null);

  const trimmed = text.trim();
  const hasContent = trimmed.length > 0;
  const ready = Boolean(previewSrc) && !error;
  const contrast = useMemo(() => contrastWarning(fg, bg), [fg, bg]);
  const contentKind = hasContent
    ? isHttpUrl(trimmed)
      ? "链接"
      : "文本"
    : null;

  useEffect(() => {
    const saved = loadSettings();
    setText(saved.text);
    setFg(saved.fg);
    setBg(saved.bg);
    setSize(saved.size);
    setEcc(saved.ecc);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings({ text, fg, bg, size, ecc });
  }, [hydrated, text, fg, bg, size, ecc]);

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      if (!hasContent) {
        setError(null);
        setPreviewSrc(null);
        return;
      }
      try {
        const dataUrl = await renderQrDataUrl(trimmed, {
          size: PREVIEW_SIZE,
          fg,
          bg,
          ecc,
        });
        if (!cancelled) {
          setError(null);
          setPreviewSrc(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setPreviewSrc(null);
          setError(
            "内容过长，当前纠错等级无法编码。请缩短文本，或改用更低的纠错等级。",
          );
        }
      }
    }

    void draw();
    return () => {
      cancelled = true;
    };
  }, [trimmed, hasContent, fg, bg, ecc]);

  useEffect(() => {
    return () => {
      if (downloadTimer.current !== null) {
        window.clearTimeout(downloadTimer.current);
      }
    };
  }, []);

  const handleDownload = useCallback(async () => {
    if (!hasContent || error) return;
    setDownloadError(null);
    try {
      await downloadQrPng(trimmed, downloadFilename(trimmed), {
        size,
        fg,
        bg,
        ecc,
      });
      setDownloaded(true);
      if (downloadTimer.current !== null) {
        window.clearTimeout(downloadTimer.current);
      }
      downloadTimer.current = window.setTimeout(() => {
        setDownloaded(false);
      }, 2000);
    } catch (cause) {
      setDownloadError(
        cause instanceof Error ? cause.message : "下载失败，请重试。",
      );
    }
  }, [hasContent, error, trimmed, size, fg, bg, ecc]);

  const applyPreset = (nextFg: string, nextBg: string) => {
    setFg(nextFg);
    setBg(nextBg);
  };

  const swapColors = () => {
    setFg(bg);
    setBg(fg);
  };

  const insertExample = () => {
    setText(EXAMPLE_URL);
  };

  const contrastMessage =
    contrast === "fail"
      ? "前景与背景对比度过低，扫描器很可能无法识别。"
      : contrast === "low"
        ? "对比度偏低，打印或在强光下扫描可能不稳定。"
        : null;

  const previewLabel = error
    ? error
    : !hasContent
      ? "尚未输入内容，二维码预览为空。"
      : `已生成${contentKind ?? ""}二维码，导出尺寸 ${size} 像素。`;

  return (
    <div className="paper-wash min-h-dvh">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:gap-10 lg:px-8 lg:py-14">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-xs font-medium tracking-widest text-muted-foreground uppercase">
            QR Studio
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="font-display text-3xl leading-tight tracking-display text-foreground sm:text-4xl">
              码印
            </h1>
            <p className="max-w-md text-sm leading-normal text-muted-foreground sm:text-right">
              输入网址或文本，实时生成可下载的二维码。
            </p>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
          <section
            aria-labelledby={`${formId}-content-heading`}
            className="order-1 rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor={contentId} id={`${formId}-content-heading`}>
                  内容
                </Label>
                <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                  {contentKind ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                      {contentKind}
                    </span>
                  ) : null}
                  <span>{text.length} 字符</span>
                </div>
              </div>
              <Textarea
                id={contentId}
                name="content"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="粘贴链接，或输入要编码的文字"
                aria-describedby={contentHintId}
                spellCheck={false}
                autoComplete="off"
                className="min-h-28"
              />
              <div
                id={contentHintId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
              >
                <p>支持网址、纯文本，修改后即时预览。</p>
                <button
                  type="button"
                  onClick={insertExample}
                  className="text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  插入示例链接
                </button>
              </div>
            </div>
          </section>

          <aside className="order-2 flex flex-col gap-4 lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium text-foreground">预览</h2>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {ready ? `${size} px PNG` : "等待内容"}
                </p>
              </div>

              <div
                className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
                aria-busy={hasContent && !ready && !error}
              >
                {previewSrc && !error ? (
                  <img
                    src={previewSrc}
                    alt={`二维码预览：${trimmed.slice(0, 80)}`}
                    className="h-full w-full object-contain"
                    width={PREVIEW_SIZE}
                    height={PREVIEW_SIZE}
                  />
                ) : null}
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center transition-opacity duration-150 ease-out-smooth",
                    ready ? "pointer-events-none opacity-0" : "opacity-100",
                  )}
                >
                  {error ? (
                    <>
                      <AlertTriangle
                        className="size-8 text-warning"
                        aria-hidden="true"
                      />
                      <p className="text-sm leading-normal text-foreground">
                        {error}
                      </p>
                    </>
                  ) : (
                    <>
                      <QrCode
                        className="size-10 text-muted-foreground"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <p className="text-sm leading-normal text-muted-foreground">
                        输入内容后，二维码将显示在这里
                      </p>
                    </>
                  )}
                </div>
              </div>

              <p id={previewStatusId} className="sr-only">
                {previewLabel}
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => void handleDownload()}
                  disabled={!hasContent || Boolean(error)}
                  aria-label={downloaded ? "已保存" : "下载 PNG"}
                  aria-describedby={`${formId}-download-hint`}
                >
                  <span className="relative inline-flex items-center justify-center" aria-hidden="true">
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center gap-2 transition-[opacity,filter,transform] duration-200 ease-out-smooth",
                        downloaded
                          ? "scale-100 opacity-100 blur-0"
                          : "scale-[0.25] opacity-0 blur-[4px]",
                      )}
                    >
                      <Check className="size-4" aria-hidden="true" />
                      已保存
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 transition-[opacity,filter,transform] duration-200 ease-out-smooth",
                        downloaded
                          ? "scale-[0.25] opacity-0 blur-[4px]"
                          : "scale-100 opacity-100 blur-0",
                      )}
                    >
                      <Download className="size-4" aria-hidden="true" />
                      下载 PNG
                    </span>
                  </span>
                </Button>
                <p
                  id={`${formId}-download-hint`}
                  className="text-sm text-muted-foreground"
                >
                  {!hasContent
                    ? "输入内容后即可下载。"
                    : error
                      ? "修复上方错误后再下载。"
                      : `将导出 ${size} × ${size} 像素的 PNG 文件。`}
                </p>
                {downloadError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {downloadError}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="px-1 text-xs leading-normal text-muted-foreground">
              深色前景、浅色背景、足够的空白边距，扫描会更稳定。设置会保存在本机。
            </p>
          </aside>

          <section
            aria-labelledby={`${formId}-options`}
            className="order-3 rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <h2 id={`${formId}-options`} className="sr-only">
              样式与导出选项
            </h2>

            <div className="flex flex-col gap-6">
              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium text-foreground">
                  纠错等级
                </legend>
                <p id={eccHintId} className="text-sm text-muted-foreground">
                  等级越高越耐污损，可容纳的内容越少。
                </p>
                <RadioGroup
                  value={ecc}
                  onValueChange={(value) => setEcc(value as EccLevel)}
                  aria-label="纠错等级"
                  aria-describedby={eccHintId}
                  className="grid grid-cols-2 gap-2"
                >
                  {ECC_LEVELS.map((level) => {
                    const itemId = `${formId}-ecc-${level.id}`;
                    const descId = `${itemId}-desc`;
                    return (
                      <div key={level.id}>
                        <RadioGroupItem
                          value={level.id}
                          id={itemId}
                          className="peer sr-only"
                          aria-describedby={descId}
                        />
                        <Label
                          htmlFor={itemId}
                          className="flex min-h-14 cursor-pointer items-start gap-3 rounded-md border border-border bg-background px-3 py-3 font-normal transition-[border-color,background-color] duration-150 ease-out-smooth peer-data-[state=checked]:border-foreground peer-data-[state=checked]:bg-secondary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-primary"
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full bg-primary transition-opacity duration-150",
                                ecc === level.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">
                              {level.name}{" "}
                              <span className="font-mono text-xs font-normal text-muted-foreground">
                                {level.id} · {level.recovery}
                              </span>
                            </span>
                            <span
                              id={descId}
                              className="text-xs leading-snug text-muted-foreground"
                            >
                              {level.hint}
                            </span>
                          </span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </fieldset>

              <Separator />

              <fieldset className="flex flex-col gap-4">
                <legend className="text-sm font-medium text-foreground">
                  颜色
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  <ColorField
                    id={`${formId}-fg`}
                    label="前景色"
                    value={fg}
                    onChange={setFg}
                  />
                  <ColorField
                    id={`${formId}-bg`}
                    label="背景色"
                    value={bg}
                    onChange={setBg}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground" id={`${formId}-presets`}>
                    配色方案
                  </p>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-labelledby={`${formId}-presets`}
                  >
                    {COLOR_PRESETS.map((preset) => {
                      const selected = fg === preset.fg && bg === preset.bg;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset.fg, preset.bg)}
                          aria-pressed={selected}
                          className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-[border-color,background-color] duration-150 ease-out-smooth",
                            selected
                              ? "border-foreground bg-secondary text-foreground"
                              : "border-border bg-background text-foreground hover:bg-secondary",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className="size-4 overflow-hidden rounded-xs border border-border"
                          >
                            <span
                              className="block size-full"
                              style={{
                                background: `linear-gradient(135deg, ${preset.fg} 50%, ${preset.bg} 50%)`,
                              }}
                            />
                          </span>
                          {preset.name}
                        </button>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={swapColors}
                      aria-label="对调前景色与背景色"
                    >
                      <ArrowLeftRight className="size-4" aria-hidden="true" />
                      对调
                    </Button>
                  </div>
                </div>
                {contrastMessage ? (
                  <p
                    id={contrastId}
                    role="status"
                    className="flex items-start gap-2 text-sm text-warning"
                  >
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{contrastMessage}</span>
                  </p>
                ) : null}
              </fieldset>

              <Separator />

              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Label id={sizeLabelId} htmlFor={`${formId}-size-slider`}>
                    导出尺寸
                  </Label>
                  <p
                    id={sizeValueId}
                    className="font-mono text-sm tabular-nums text-muted-foreground"
                  >
                    {size} × {size} px
                  </p>
                </div>
                <Slider
                  id={`${formId}-size-slider`}
                  min={SIZE_MIN}
                  max={SIZE_MAX}
                  step={SIZE_STEP}
                  value={[size]}
                  onValueChange={(values) => setSize(values[0] ?? size)}
                  aria-label="导出尺寸"
                  aria-labelledby={sizeLabelId}
                  aria-describedby={sizeValueId}
                  aria-valuetext={`${size} 像素`}
                />
                <div className="flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
                  <span>{SIZE_MIN} px</span>
                  <span>{SIZE_MAX} px</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const pickerId = `${id}-picker`;
  const hexId = `${id}-hex`;
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = (raw: string) => {
    const hex = normalizeHex(raw);
    if (hex) {
      onChange(hex);
      setDraft(hex);
    } else {
      setDraft(value);
    }
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="flex min-w-0 items-center gap-2">
        <input
          id={pickerId}
          type="color"
          value={value.toLowerCase()}
          onChange={(event) => {
            const hex = normalizeHex(event.target.value);
            if (hex) onChange(hex);
          }}
          aria-label={`${label}色板`}
        />
        <Input
          id={hexId}
          value={draft}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const hex = normalizeHex(next);
            if (hex) onChange(hex);
          }}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(draft);
            }
          }}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          aria-label={`${label}十六进制代码`}
          className="min-w-0 font-mono uppercase"
        />
      </div>
    </fieldset>
  );
}
