import { readFile } from "fs/promises";
import { createPublicClient, createWalletClient, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { worldchain } from "viem/chains";

const DEFAULT_WLD_TOKEN_ADDRESS =
  "0x2cfc85d8e48f8eab294be644d9e25c3030863003";

async function main() {
  const wldToken = process.env.SENTIA_WLD_TOKEN_ADDRESS ?? DEFAULT_WLD_TOKEN_ADDRESS;
  const initialOwner = process.env.SENTIA_VAULT_OWNER_ADDRESS;
  const privateKey = process.env.SENTIA_DEPLOYER_PRIVATE_KEY;

  if (!initialOwner) {
    throw new Error("SENTIA_VAULT_OWNER_ADDRESS is required.");
  }

  if (!privateKey) {
    throw new Error("SENTIA_DEPLOYER_PRIVATE_KEY is required.");
  }

  if (!isAddress(wldToken)) {
    throw new Error("SENTIA_WLD_TOKEN_ADDRESS must be a valid EVM address.");
  }

  if (!isAddress(initialOwner)) {
    throw new Error("SENTIA_VAULT_OWNER_ADDRESS must be a valid EVM address.");
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("SENTIA_DEPLOYER_PRIVATE_KEY must be a 32-byte hex private key.");
  }

  const artifactUrl = new URL(
    "../artifacts/contracts/SentiaRewardVault.sol/SentiaRewardVault.json",
    import.meta.url,
  );
  const artifact = JSON.parse(await readFile(artifactUrl, "utf8")) as {
    abi: unknown[];
    bytecode: `0x${string}`;
  };
  const transport = http(process.env.WORLD_CHAIN_RPC_URL);
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: worldchain,
    transport,
  });
  const publicClient = createPublicClient({
    chain: worldchain,
    transport,
  });

  const txHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [wldToken, initialOwner],
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  console.log("SentiaRewardVault deployed to:", receipt.contractAddress);
  console.log("Deploy tx:", txHash);
  console.log("Chain ID:", worldchain.id);
  console.log("Deployer:", account.address);
  console.log("WLD token:", wldToken);
  console.log("Owner:", initialOwner);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
