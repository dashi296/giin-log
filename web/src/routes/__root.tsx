import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"

import appCss from "@/styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "大津市議会 議員活動ログ" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen">
        <header className="border-b">
          <div className="mx-auto max-w-5xl px-6 py-4">
            <Link to="/" className="text-lg font-bold">
              大津市議会 議員活動ログ
            </Link>
          </div>
        </header>
        {children}
        <footer className="mt-16 border-t">
          <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-gray-500">
            大津市議会 議員活動ログ
          </div>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
