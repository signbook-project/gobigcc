import { Providers } from "@/components/layout/Providers";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GoBig.cc — The Open Design Network", template: "%s | GoBig.cc" },
  description: "Publish designs, solve challenges, find design talent. The GitHub for designers.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://gobig.cc"),
  openGraph: {
    siteName: "GoBig.cc",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}