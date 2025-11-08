import './globals.css'

export const metadata = {
  title: 'Kora - AI Vision Assistant',
  description: 'AI-powered vision assistance for enhanced spatial awareness',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
