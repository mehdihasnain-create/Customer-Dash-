import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Klarity Support Report",
  description: "Zendesk support metrics dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
