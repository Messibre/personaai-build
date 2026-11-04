import type { EvidenceLedger } from "./ledger"

const records = new Map<string, EvidenceLedger>()

export function saveLedger(ledger: EvidenceLedger): void {
  records.set(ledger.analysisId, ledger)
}

export function getLedger(analysisId: string): EvidenceLedger | null {
  const ledger = records.get(analysisId)
  if (!ledger || ledger.expiresAt <= Date.now()) {
    records.delete(analysisId)
    return null
  }
  return ledger
}
