import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted by next/font (no render-blocking request to Google Fonts);
// globals.css reads it through --font-jakarta.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "Msingi — Learn. Practise. Grow.",
  description: "Msingi is a complete CBC learning and revision platform for PP1 through Grade 12.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="msingi min-h-full flex flex-col">{children}</body>
    </html>
  );
}
