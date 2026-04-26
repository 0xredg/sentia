import {
  createPublicClient,
  getContract,
  hashMessage,
  http,
  recoverMessageAddress,
} from "viem";
import { worldchain } from "viem/chains";
import { normalizeAddress } from "./claim-message";

const EIP1271_MAGIC_VALUE = "0x1626ba7e";

const eip1271Abi = [
  {
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    name: "isValidSignature",
    outputs: [{ name: "magicValue", type: "bytes4" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

type VerifyClaimSignatureInput = {
  message: string;
  signature: `0x${string}`;
  expectedWalletAddress: string;
};

export type ClaimSignatureVerification =
  | {
      isValid: true;
      via: "eoa" | "eip1271";
      recoveredAddress: string | null;
    }
  | {
      isValid: false;
      via: null;
      recoveredAddress: string | null;
    };

export async function verifyClaimSignature({
  message,
  signature,
  expectedWalletAddress,
}: VerifyClaimSignatureInput): Promise<ClaimSignatureVerification> {
  const normalizedExpectedWallet = normalizeAddress(expectedWalletAddress);
  const recoveredAddress = await recoverMessageAddress({
    message,
    signature,
  })
    .then((address) => normalizeAddress(address))
    .catch(() => null);

  if (recoveredAddress === normalizedExpectedWallet) {
    return {
      isValid: true,
      via: "eoa",
      recoveredAddress,
    };
  }

  const client = createPublicClient({
    chain: worldchain,
    transport: http(process.env.WORLD_CHAIN_RPC_URL),
  });
  const walletContract = getContract({
    address: normalizedExpectedWallet as `0x${string}`,
    abi: eip1271Abi,
    client,
  });

  const result = await walletContract.read
    .isValidSignature([hashMessage(message), signature])
    .catch(() => null);

  if (result === EIP1271_MAGIC_VALUE) {
    return {
      isValid: true,
      via: "eip1271",
      recoveredAddress,
    };
  }

  return {
    isValid: false,
    via: null,
    recoveredAddress,
  };
}
