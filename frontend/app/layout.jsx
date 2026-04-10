import { Geist, Geist_Mono, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq-urdu",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "SIBA Chatbot",
  description: "Sukkur IBA University AI Chatbot",
  icons: {
    icon: "/image.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nastaliqUrdu.variable} antialiased`}
      >
        <LanguageProvider>
          <ThemeProvider>
            <MaintenanceBanner />
            {children}
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

