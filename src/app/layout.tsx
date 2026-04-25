import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileTabs } from "@/components/mobile-tabs";
import { PageBackground } from "@/components/page-background";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Ausbildung Hub Vietnam — Du học nghề Đức cho người Việt",
  description:
    "Nền tảng số 1 về du học nghề Đức dành cho người Việt Nam — tin tức, trung tâm tiếng Đức, đơn tuyển và cộng đồng.",
  keywords: [
    "Ausbildung",
    "du học nghề Đức",
    "tiếng Đức",
    "Vietnam",
    "visa Ausbildung",
    "điều dưỡng Đức",
  ],
  metadataBase: new URL("https://ausbildung-hub-vietnam.vercel.app"),
  openGraph: {
    title: "Ausbildung Hub Vietnam",
    description: "Cơ hội đào tạo nghề – Sự nghiệp bền vững tại Đức",
    type: "website",
    locale: "vi_VN",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fbff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <PageBackground />
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <SiteFooter />
          </div>
          <MobileTabs />
        </ThemeProvider>
      </body>
    </html>
  );
}
