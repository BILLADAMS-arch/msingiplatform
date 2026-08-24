import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Msingi — Learn. Practise. Grow.",
  description: "Msingi is a complete CBC learning and revision platform for PP1 through Grade 12.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="msingi min-h-full flex flex-col">{children}</body>
    </html>
  );
}
