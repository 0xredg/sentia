import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/unbounded/400.css";
import "@fontsource/unbounded/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentia",
  description: "Verified human judgment tasks for World.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
