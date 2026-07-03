import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Federal Award Signal",
  description:
    "Research comparable federal awards from a SAM.gov opportunity URL.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
