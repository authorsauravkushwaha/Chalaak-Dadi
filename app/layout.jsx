import "./globals.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/600.css";
import "@fontsource/noto-sans-devanagari/700.css";
import "@fontsource/noto-sans-gurmukhi/400.css";
import "@fontsource/noto-sans-gurmukhi/600.css";
import "@fontsource/noto-sans-gurmukhi/700.css";

export const metadata = {
  title: "Chalaak Dadi — Scam Intelligence Console · चतुर दादी · ਚਤੁਰ ਦਾਦੀ",
  description:
    "An AI-powered scam-intelligence & financial-fraud-awareness prototype. A sweet Dadi voice keeps scammers busy while the console captures UPI IDs, phone numbers and bank details — in English, हिन्दी and ਪੰਜਾਬੀ.",
  keywords: ["cyber fraud", "scam awareness", "digital arrest", "India", "1930", "cybercrime", "चतुर दादी", "ਚਤੁਰ ਦਾਦੀ"],
};

export const viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
