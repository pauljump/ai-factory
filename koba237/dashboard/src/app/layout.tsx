import "./globals.css"
import { Space_Grotesk } from "next/font/google"

const font = Space_Grotesk({ subsets: ["latin"] })

export const metadata = {
  title: "Koba — Factory Dashboard",
  description: "Idea cards, enrichments, and the factory line.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={font.className}>
        {children}
      </body>
    </html>
  )
}
