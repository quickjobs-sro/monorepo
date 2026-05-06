import { Montserrat, Red_Hat_Display } from "next/font/google";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { AppProviders } from "@/components/AppProviders";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";
import "@ui/styles/globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-red-hat-display",
});

export const metadata: Metadata = {
  title: "QuickJobs Admin",
  description: "Read-only command center over the QuickJobs admin and catalog endpoints.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialHasToken = cookieStore.has(AUTH_TOKEN_COOKIE_NAME);

  return (
    <html lang="cs">
      <body className={`${montserrat.variable} ${redHatDisplay.variable} min-h-screen font-[family-name:var(--font-montserrat)]`}>
        <AppProviders initialHasToken={initialHasToken}>{children}</AppProviders>
      </body>
    </html>
  );
}
