import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServerProviders from "./server-providers";

const themeInitScript = `(() => {
  try {
    const storedTheme = localStorage.getItem('lb-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const chosenTheme = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
      ? storedTheme
      : null;
    const resolved = chosenTheme === 'dark'
      ? 'dark'
      : chosenTheme === 'light'
        ? 'light'
        : prefersDark
          ? 'dark'
          : 'light';
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved === 'dark' ? 'dark' : 'light';
    const storedLang = localStorage.getItem('lb-language');
    if (storedLang) {
      document.documentElement.lang = storedLang.toLowerCase();
    }
  } catch (e) {
    /* no-op */
  }
})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lekbanken - Frontend Architecture",
  description:
    "Separata UI-världar för Marketing, App och Admin i Next.js App Router med delade providers och komponenter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className="bg-background text-foreground"
      data-theme="light"
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ServerProviders>
          {children}
        </ServerProviders>
      </body>
    </html>
  );
}
