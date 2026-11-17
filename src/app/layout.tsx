import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ISKCON Detroit Seva", template: "%s · ISKCON Detroit Seva" },
  description: "Offer your seva and donations for festivals at ISKCON Detroit.",
};

export const viewport: Viewport = {
  themeColor: "#b4440e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
