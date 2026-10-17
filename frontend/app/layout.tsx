import type { Metadata } from "next";
import { LocaleProvider } from "../components/LocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inky Pup 黑犬聽寫",
  description:
    "Scan dictation sheets with OCR, review, and play back with speech synthesis. 掃描聽寫紙、檢查生字，再朗讀出來練習。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}