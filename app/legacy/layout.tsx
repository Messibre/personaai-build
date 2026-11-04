import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Legacy portfolio builder | PersonaAI",
  robots: { index: false, follow: false },
}

export default function LegacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div role="note" className="border-b border-border bg-secondary px-4 py-3 text-center text-sm text-foreground">
        This is the old generic portfolio builder. The new job-tailoring tool is at{" "}
        <Link href="/vault" className="font-medium underline underline-offset-4">
          /vault
        </Link>{" "}
        and{" "}
        <Link href="/tailor" className="font-medium underline underline-offset-4">
          /tailor
        </Link>
        .
      </div>
      {children}
    </>
  )
}
