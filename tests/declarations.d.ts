declare module "pdf-parse" {
  interface PdfParseResult {
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: Record<string, unknown>
    text: string
    version: string
  }

  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: {
      pagerender?: (pageData: unknown) => string | Promise<string>
      max?: number
      version?: string
    }
  ): Promise<PdfParseResult>

  export default pdfParse
}
