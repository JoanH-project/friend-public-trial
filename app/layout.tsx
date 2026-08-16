import type { Metadata } from "next";
import "./globals.css";
import "../components/submit.css";
import "../components/forum.css";

export const metadata: Metadata = { title: "Friend Public Trial", description: "Friends-only mock public trial." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
