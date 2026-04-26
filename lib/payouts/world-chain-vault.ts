import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatEther,
  http,
  keccak256,
  parseEther,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { worldchain } from "viem/chains";
import { sentiaRewardVaultAbi } from "@/lib/contracts/sentiaRewardVaultAbi";
import {
  ZERO_ADDRESS,
  getClaimConfig,
  normalizeAddress,
} from "@/lib/earnings/claim-message";

export type VaultPayoutEarning = {
  id: string;
  amount: string | number;
};

export type VaultBatchPayoutInput = {
  worker: string;
  earnings: VaultPayoutEarning[];
};

export type PreparedVaultBatchPayout = {
  account: ReturnType<typeof privateKeyToAccount>;
  publicClient: any;
  walletClient: any;
  chainId: number;
  vaultAddress: string;
  tokenAddress: string;
  workerAddress: string;
  earningIdHashes: `0x${string}`[];
  workers: `0x${string}`[];
  amounts: bigint[];
  vaultTokenAddress: string;
  totalAmount: bigint;
  vaultBalance: bigint;
};

export type WorldChainPayoutMetadata = {
  txHash: `0x${string}`;
  chainId: number;
  vaultAddress: string;
  tokenAddress: string;
};

export class VaultPayoutSubmittedError extends Error {
  payout: {
    txHash: `0x${string}`;
    chainId: number;
    vaultAddress: string;
    tokenAddress: string;
    earningIdHashes: `0x${string}`[];
  };

  constructor({
    txHash,
    prepared,
    cause,
  }: {
    txHash: `0x${string}`;
    prepared: PreparedVaultBatchPayout;
    cause: unknown;
  }) {
    super(
      cause instanceof Error
        ? cause.message
        : "Could not confirm World Chain payout transaction.",
    );

    this.name = "VaultPayoutSubmittedError";
    this.cause = cause;
    this.payout = {
      txHash,
      chainId: prepared.chainId,
      vaultAddress: prepared.vaultAddress,
      tokenAddress: prepared.tokenAddress,
      earningIdHashes: prepared.earningIdHashes,
    };
  }
}

export function buildVaultEarningIdHash(earningId: string) {
  return keccak256(toBytes(earningId));
}

export function createWorldChainPublicClient() {
  return createPublicClient({
    chain: worldchain,
    transport: getTransport(),
  });
}

function getTransport() {
  return http(process.env.WORLD_CHAIN_RPC_URL);
}

function getPayoutAccount() {
  const privateKey = process.env.SENTIA_PAYOUT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("SENTIA_PAYOUT_PRIVATE_KEY is required.");
  }

  return privateKeyToAccount(privateKey as `0x${string}`);
}

export function assertWorldChainVaultPayoutConfig() {
  const claimConfig = getClaimConfig();

  if (claimConfig.chainId !== worldchain.id) {
    throw new Error("SENTIA_CHAIN_ID must be 480 for World Chain payouts.");
  }

  if (claimConfig.vaultAddress === ZERO_ADDRESS) {
    throw new Error("SENTIA_VAULT_ADDRESS is required for real payouts.");
  }

  if (!process.env.SENTIA_PAYOUT_PRIVATE_KEY) {
    throw new Error("SENTIA_PAYOUT_PRIVATE_KEY is required for real payouts.");
  }

  return claimConfig;
}

export async function prepareWorldChainVaultBatchPayout({
  worker,
  earnings,
}: VaultBatchPayoutInput): Promise<PreparedVaultBatchPayout> {
  if (earnings.length === 0) {
    throw new Error("No earnings to pay.");
  }

  const claimConfig = assertWorldChainVaultPayoutConfig();
  const vaultAddress = normalizeAddress(claimConfig.vaultAddress);
  const workerAddress = normalizeAddress(worker);
  const account = getPayoutAccount();
  const transport = getTransport();
  const publicClient = createWorldChainPublicClient();
  const walletClient = createWalletClient({
    account,
    chain: worldchain,
    transport,
  });
  const earningIdHashes = earnings.map((earning) =>
    buildVaultEarningIdHash(earning.id),
  );
  const workers = earnings.map(() => workerAddress as `0x${string}`);
  const amounts = earnings.map((earning) => parseEther(String(earning.amount)));
  const totalAmount = amounts.reduce(
    (total, amount) => total + amount,
    BigInt(0),
  );
  const vaultTokenAddress = normalizeAddress(
    await publicClient.readContract({
      address: vaultAddress as `0x${string}`,
      abi: sentiaRewardVaultAbi,
      functionName: "wld",
    }),
  );

  if (vaultTokenAddress !== claimConfig.tokenAddress) {
    throw new Error(
      `Vault token mismatch: expected ${claimConfig.tokenAddress}, got ${vaultTokenAddress}.`,
    );
  }

  const vaultBalance = await publicClient.readContract({
    address: claimConfig.tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [vaultAddress as `0x${string}`],
  });

  if (vaultBalance < totalAmount) {
    throw new Error(
      `Vault WLD balance is too low: need ${formatEther(totalAmount)} WLD, have ${formatEther(vaultBalance)} WLD.`,
    );
  }

  return {
    account,
    publicClient,
    walletClient,
    chainId: claimConfig.chainId,
    vaultAddress,
    tokenAddress: claimConfig.tokenAddress,
    workerAddress,
    earningIdHashes,
    workers,
    amounts,
    vaultTokenAddress,
    totalAmount,
    vaultBalance,
  };
}

export async function payoutPreparedWorldChainVaultBatch(
  prepared: PreparedVaultBatchPayout,
) {
  const {
    publicClient,
    walletClient,
    vaultAddress,
    earningIdHashes,
    workers,
    amounts,
  } = prepared;

  const txHash = await walletClient.writeContract({
    address: vaultAddress as `0x${string}`,
    abi: sentiaRewardVaultAbi,
    functionName: "payoutBatch",
    args: [earningIdHashes, workers, amounts],
  });
  const receipt = await publicClient
    .waitForTransactionReceipt({
      hash: txHash,
    })
    .catch((error: unknown) => {
      throw new VaultPayoutSubmittedError({
        txHash,
        prepared,
        cause: error,
      });
    });

  if (receipt.status !== "success") {
    throw new Error(`Vault payout transaction failed: ${txHash}`);
  }

  return {
    txHash,
    chainId: prepared.chainId,
    vaultAddress,
    tokenAddress: prepared.tokenAddress,
    earningIdHashes,
  };
}

export async function payoutWorldChainVaultBatch(input: VaultBatchPayoutInput) {
  const prepared = await prepareWorldChainVaultBatchPayout(input);

  return payoutPreparedWorldChainVaultBatch(prepared);
}

export async function readVaultPaidStatus({
  earningIds,
  vaultAddress,
}: {
  earningIds: string[];
  vaultAddress?: string;
}) {
  const claimConfig = assertWorldChainVaultPayoutConfig();
  const resolvedVaultAddress = normalizeAddress(
    vaultAddress ?? claimConfig.vaultAddress,
  );
  const publicClient = createWorldChainPublicClient();

  return Promise.all(
    earningIds.map(async (earningId) => {
      const earningIdHash = buildVaultEarningIdHash(earningId);
      const isPaid = await publicClient.readContract({
        address: resolvedVaultAddress as `0x${string}`,
        abi: sentiaRewardVaultAbi,
        functionName: "paid",
        args: [earningIdHash],
      });

      return {
        earningId,
        earningIdHash,
        isPaid,
      };
    }),
  );
}
