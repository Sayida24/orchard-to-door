"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export type QrLabelProps = {
  qrCode: string;
  orderNum: string;
  variety: string;
  quantityKg: number;
  isGiftBox: boolean;
  orchardName: string;
  orchardLocation: string;
  sellerFirst: string;
  pickedLabel: string;
  checkedAtLabel: string;
  aiSummaryText: string;
  totalMangoes: number;
  healthyCount: number;
  diseasedCount: number;
  scanCount: number;
};

export function QrLabelCard(props: QrLabelProps) {
  const [{ qrDataUrl, verifyUrl }, setQrState] = useState<{ qrDataUrl: string; verifyUrl: string }>({
    qrDataUrl: "",
    verifyUrl: `/verify/${encodeURIComponent(props.qrCode)}`,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fullUrl = `${window.location.origin}/verify/${encodeURIComponent(props.qrCode)}`;
    let active = true;
    QRCode.toDataURL(fullUrl, {
      width: 560,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1B2A1F", light: "#FFFFFF" },
    })
      .then((url) => {
        if (active) setQrState({ qrDataUrl: url, verifyUrl: fullUrl });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [props.qrCode]);

  async function downloadFullLabel() {
    const canvas = document.createElement("canvas");
    const W = 840;
    const H = 1120;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background card
    ctx.fillStyle = "#FBF8F1";
    ctx.fillRect(0, 0, W, H);

    // Outer border
    ctx.strokeStyle = "#1F4D2B";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    // Header bar
    ctx.fillStyle = "#1F4D2B";
    ctx.fillRect(24, 24, W - 48, 132);

    ctx.fillStyle = "#F4A71D";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText("ORCHIVA VERIFIED PARCEL", 60, 72);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 40px Georgia, serif";
    ctx.fillText(`Order #${props.orderNum}`, 60, 124);

    // Order summary right-aligned in header
    ctx.textAlign = "right";
    ctx.fillStyle = "#E6EFE4";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText(`${props.quantityKg} kg ${props.variety}`, W - 60, 118);
    ctx.textAlign = "left";

    // White QR frame
    const qrBoxSize = 420;
    const qrX = (W - qrBoxSize) / 2;
    const qrY = 196;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(qrX, qrY, qrBoxSize, qrBoxSize);
    ctx.strokeStyle = "#E9E2D2";
    ctx.lineWidth = 3;
    ctx.strokeRect(qrX, qrY, qrBoxSize, qrBoxSize);

    if (qrDataUrl) {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = qrDataUrl;
      });
      ctx.drawImage(img, qrX + 20, qrY + 20, qrBoxSize - 40, qrBoxSize - 40);
    }

    // Verification code pill
    ctx.fillStyle = "#1B2A1F";
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.fillText(props.qrCode, W / 2, 668);

    // AI Quality badge
    const badgeY = 700;
    ctx.fillStyle = props.diseasedCount > 0 ? "#FDF0D5" : "#E6EFE4";
    ctx.fillRect(60, badgeY, W - 120, 76);
    ctx.fillStyle = props.diseasedCount > 0 ? "#7A4A00" : "#1F4D2B";
    ctx.font = "bold 24px system-ui, sans-serif";
    const statusLine =
      props.diseasedCount > 0
        ? `AI Check: ${props.healthyCount} healthy, ${props.diseasedCount} flagged (${props.totalMangoes} checked)`
        : `AI Verified: All ${props.totalMangoes} mangoes look healthy`;
    ctx.fillText(statusLine, W / 2, badgeY + 47);

    // Details section
    ctx.textAlign = "left";
    ctx.fillStyle = "#5B675D";
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText("ORCHARD", 64, 832);
    ctx.fillText("HARVEST & PACKING", 64, 922);

    ctx.fillStyle = "#1B2A1F";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText(`${props.orchardName} (${props.orchardLocation})`, 64, 868);
    ctx.font = "600 23px system-ui, sans-serif";
    ctx.fillText(`Picked ${props.pickedLabel} · AI checked ${props.checkedAtLabel}`, 64, 956);

    // Footer instruction
    ctx.strokeStyle = "#E9E2D2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 1004);
    ctx.lineTo(W - 60, 1004);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#1F4D2B";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText("Scan this QR code when your parcel arrives to inspect box quality.", W / 2, 1052);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `orchiva-label-${props.qrCode}.png`;
    a.click();
  }

  function downloadQrOnly() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `orchiva-qr-${props.qrCode}.png`;
    a.click();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  const healthyOnly = props.diseasedCount === 0;

  return (
    <div className="space-y-5">
      {/* Action buttons — hidden when printing */}
      <div className="flex flex-wrap gap-2.5 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-dark"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect width="12" height="8" x="6" y="14" />
          </svg>
          Print box label
        </button>
        <button
          type="button"
          onClick={() => void downloadFullLabel()}
          disabled={!qrDataUrl}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-mango px-5 py-2.5 text-sm font-bold text-ink hover:bg-mango-dark disabled:opacity-50"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Download label (PNG)
        </button>
        <button
          type="button"
          onClick={downloadQrOnly}
          disabled={!qrDataUrl}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-cream disabled:opacity-50"
        >
          Download QR only
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-cream"
        >
          {copied ? "Link copied!" : "Copy verification link"}
        </button>
      </div>

      {/* Printable Box Verification Label */}
      <article className="mx-auto max-w-md overflow-hidden rounded-3xl border-2 border-leaf bg-cream shadow-sm print:max-w-none print:rounded-none print:shadow-none">
        <div className="bg-leaf px-6 py-4 text-white">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-mango">Orchiva Verified Parcel</p>
            {props.isGiftBox && (
              <span className="rounded-full bg-mango px-2.5 py-0.5 text-[11px] font-bold text-ink">Gift box</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold">Order #{props.orderNum}</h2>
            <p className="text-base font-semibold text-leaf-soft">
              {props.quantityKg} kg {props.variety}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6 text-center">
          <div className="mx-auto inline-flex flex-col items-center rounded-2xl border border-line bg-white p-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- generated data URL for printable QR code
              <img
                src={qrDataUrl}
                alt={`QR verification code ${props.qrCode} for order #${props.orderNum}`}
                className="h-56 w-56"
              />
            ) : (
              <div className="flex h-56 w-56 items-center justify-center bg-stone-50 text-sm text-muted">
                Generating QR…
              </div>
            )}
            <p className="mt-2 font-mono text-lg font-bold tracking-wider text-ink">{props.qrCode}</p>
          </div>

          <p
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
              healthyOnly ? "bg-leaf-soft text-leaf" : "border border-[#F2D9A6] bg-mango-soft text-mango-ink"
            }`}
          >
            {healthyOnly
              ? `AI Verified: All ${props.totalMangoes} mangoes look healthy`
              : `AI Check: ${props.aiSummaryText}`}
          </p>

          <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-left text-sm">
            <div>
              <dt className="text-xs font-medium text-muted">Orchard</dt>
              <dd className="font-semibold text-ink">{props.orchardName}</dd>
              <dd className="text-xs text-muted">{props.orchardLocation}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Harvest &amp; check</dt>
              <dd className="font-semibold text-ink">Picked {props.pickedLabel}</dd>
              <dd className="text-xs text-muted">AI checked {props.checkedAtLabel}</dd>
            </div>
          </dl>

          <p className="border-t border-line pt-3 text-xs font-medium text-leaf">
            Place this label inside or on the box. Customers can scan it to inspect AI quality results and orchard origin.
          </p>
        </div>
      </article>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted print:hidden">
        <span>
          Customer scan count: <strong className="text-ink">{props.scanCount}</strong>
        </span>
        <span className="truncate font-mono">{verifyUrl}</span>
      </div>
    </div>
  );
}