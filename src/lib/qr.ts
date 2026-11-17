import "server-only";
import QRCode from "qrcode";

export async function qrSvg(text: string, opts: { margin?: number; color?: string } = {}): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: opts.margin ?? 1,
    color: { dark: opts.color ?? "#2b1d14", light: "#ffffff" },
  });
}
