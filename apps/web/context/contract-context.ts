import { Contract, Networks } from "@stellar/soroban-client"

const GROUP_CONTRACT_ID =
  process.env.NEXT_PUBLIC_GROUP_CONTRACT_ID!

const RPC_URL = "https://soroban-testnet.stellar.org"

export function getGroupContract() {
  if (!GROUP_CONTRACT_ID) {
    throw new Error("Missing GROUP_CONTRACT_ID env variable")
  }

  return new Contract(GROUP_CONTRACT_ID, {
    networkPassphrase: Networks.TESTNET,
    rpcUrl: RPC_URL,
  })
}
