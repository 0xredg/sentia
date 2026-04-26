import { isAddress, keccak256, toBytes } from "viem";

export const DEFAULT_WLD_TOKEN_ADDRESS =
  "0x2cfc85d8e48f8eab294be644d9e25c3030863003";
export const DEFAULT_WORLD_CHAIN_ID = 480;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const CLAIM_INTENT_TTL_SECONDS = 10 * 60;

export type ClaimMessageInput = {
  walletAddress: string;
  vaultAddress: string;
  chainId: number;
  tokenAddress: string;
  earningIdsHash: string;
  amountWei: string;
  nonce: string | number;
  deadline: string | number;
};

export function getClaimConfig() {
  const chainId = Number(process.env.SENTIA_CHAIN_ID ?? DEFAULT_WORLD_CHAIN_ID);

  return {
    vaultAddress: normalizeAddress(
      process.env.SENTIA_VAULT_ADDRESS || ZERO_ADDRESS,
    ),
    chainId: Number.isFinite(chainId) ? chainId : DEFAULT_WORLD_CHAIN_ID,
    tokenAddress: normalizeAddress(
      process.env.SENTIA_WLD_TOKEN_ADDRESS ?? DEFAULT_WLD_TOKEN_ADDRESS,
    ),
  };
}

export function normalizeAddress(address: string) {
  if (!isAddress(address)) {
    throw new Error("Invalid EVM address.");
  }

  return address.toLowerCase();
}

export function buildEarningIdsHash(earningIds: string[]) {
  const sorted = [...earningIds].sort();

  return keccak256(toBytes(JSON.stringify(sorted)));
}

export function decimalWldToWei(value: string | number) {
  const normalized = String(value).trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid WLD amount.");
  }

  const [whole = "0", fraction = ""] = normalized.split(".");
  const weiFraction = fraction.padEnd(18, "0").slice(0, 18);

  if (fraction.length > 18 && /[1-9]/.test(fraction.slice(18))) {
    throw new Error("WLD amount has too many decimals.");
  }

  return (
    BigInt(whole) * BigInt("1000000000000000000") +
    BigInt(weiFraction || "0")
  ).toString();
}

export function addDecimalStrings(first: string, second: string) {
  const [firstWhole = "0", firstFraction = ""] = first.split(".");
  const [secondWhole = "0", secondFraction = ""] = second.split(".");
  const fractionLength = Math.max(firstFraction.length, secondFraction.length);
  const firstUnits = BigInt(
    `${firstWhole}${firstFraction.padEnd(fractionLength, "0")}`,
  );
  const secondUnits = BigInt(
    `${secondWhole}${secondFraction.padEnd(fractionLength, "0")}`,
  );
  const totalUnits = firstUnits + secondUnits;

  if (fractionLength === 0) {
    return totalUnits.toString();
  }

  const absoluteTotal = totalUnits.toString().padStart(fractionLength + 1, "0");
  const whole = absoluteTotal.slice(0, -fractionLength);
  const fraction = absoluteTotal.slice(-fractionLength).replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}

export function sumWldAmounts(values: Array<string | number>) {
  return values.reduce<string>(
    (total, value) => addDecimalStrings(total, String(value)),
    "0",
  );
}

export function buildClaimMessage(input: ClaimMessageInput) {
  const walletAddress = normalizeAddress(input.walletAddress);
  const vaultAddress = normalizeAddress(input.vaultAddress);
  const tokenAddress = normalizeAddress(input.tokenAddress);

  return `Sentia Claim Authorization

Action: Claim WLD rewards
Wallet: ${walletAddress}
Vault: ${vaultAddress}
Chain ID: ${input.chainId}
Token: WLD
Token Address: ${tokenAddress}
Earnings Hash: ${input.earningIdsHash}
Amount Wei: ${input.amountWei}
Nonce: ${input.nonce}
Deadline: ${input.deadline}

Only sign this message inside Sentia if you intend to claim these rewards to your World Wallet.`;
}

export function getClaimDeadline(now = Date.now()) {
  return Math.floor(now / 1000) + CLAIM_INTENT_TTL_SECONDS;
}
