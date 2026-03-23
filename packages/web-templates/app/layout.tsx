import "./globals.css"
import { Inter } from "next/font/google"
// Swap Inter for your brand font (e.g. Barlow_Condensed, Space_Grotesk, etc.)

const font = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "App Name",
  description: "One-line description of what this app does.",
  // Uncomment and fill for social sharing:
  // openGraph: {
  //   type: "website",
  //   title: "App Name",
  //   description: "...",
  //   url: "https://your-domain.com",
  //   images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  // },
  // twitter: {
  //   card: "summary_large_image",
  //   title: "App Name",
  //   description: "...",
  //   images: ["/og-image.png"],
  // },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={font.className}>
        {children}
      </body>
    </html>
  )
}
