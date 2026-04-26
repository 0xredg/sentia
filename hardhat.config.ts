import type { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    worldchain: {
      type: "http",
      url: process.env.WORLD_CHAIN_RPC_URL ?? "https://worldchain-mainnet.g.alchemy.com/public",
      accounts: process.env.SENTIA_DEPLOYER_PRIVATE_KEY
        ? [process.env.SENTIA_DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 480,
    },
  },
};

export default config;
