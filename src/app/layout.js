// src/app/layout.jsx - Root layout that determines which UI to show based on hostname
// archaic: import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { headers } from 'next/headers'

// archaic: const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
// archaic: const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata = {
  title: "Al-Faqih",
  description:
    "Discover authentic Shia Hadiths with our advanced finder. Explore centuries of wisdom and narrations on one intuitive platform.",
}

export default async function RootLayout({ children }) {
  // Get the host from headers
  const headersList = await headers()
  const host = headersList.get('host') || ''
  
  // The root is the local chat everywhere except the public landing domains.
  const isLandingDomain = host === 'alfaqih.org' || host === 'www.alfaqih.org'
  
  // archaic: const isChatDomain = host === 'chat.alfaqih.org' || host === 'www.chat.alfaqih.org'
  // archaic: const ChatPage = isChatDomain ? require('../app/page').default : null
  // archaic: const LandingPage = !isChatDomain ? require('../app/landing/page').default : null
  const LandingPage = isLandingDomain ? require('../app/landing/page').default : null
  
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
      </head>
      <body className="antialiased">
        {isLandingDomain ? <LandingPage /> : children}
      </body>
    </html>
  )
}
