// pdf-parse relies on Node Buffer APIs, so this route must run on the Node.js runtime.
export const runtime = "nodejs";

import { ONE_MINUTE_MS, withGuards } from "@/lib/security/guard"
import { NextResponse } from "next/server";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const PDF_MAGIC = "%PDF-";

function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC.length).toString("latin1") === PDF_MAGIC;
}

export const POST = withGuards(handlePost, { route: "parse-resume", max: 5, windowMs: ONE_MINUTE_MS })

async function handlePost(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // file.type is client-supplied, so verify the actual content too.
    if (file.type !== "application/pdf" || !looksLikePdf(buffer)) {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 },
      );
    }

    let text: string;
    try {
      // Dynamic import keeps pdf-parse out of the module graph until it is needed.
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text?.trim() ?? "";
    } catch (parseErr) {
      // A PDF that pdf-parse rejects is a problem with the file, not the server.
      console.warn("[parse-resume] unreadable PDF:", parseErr);
      return NextResponse.json(
        {
          error:
            "This PDF could not be read. It may be corrupted or password-protected. Try exporting it again.",
        },
        { status: 422 },
      );
    }

    if (!text) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from this PDF. It may be image-based or scanned. Try a text-based PDF.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    const traceId = crypto.randomUUID();
    console.error(`[parse-resume] error [${traceId}]:`, err);
    return NextResponse.json(
      { error: "Failed to parse resume", traceId },
      { status: 500 },
    );
  }
}
