export type PayoutMode = "mock" | "real";

export function getPayoutMode(): PayoutMode {
  return process.env.NEXT_PUBLIC_SENTIA_MOCK_ADMIN === "true"
    ? "mock"
    : "real";
}

export function assertClaimMode(
  rowMode: string | null | undefined,
  currentMode = getPayoutMode(),
) {
  return rowMode === currentMode;
}

export function getWorldscanTxUrl(txHash: string) {
  return `https://worldscan.org/tx/${txHash}`;
}
