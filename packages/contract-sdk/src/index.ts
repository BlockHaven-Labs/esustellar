import { Contract, SorobanRpc, TransactionBuilder, Networks, BASE_FEE } from "@stellar/stellar-sdk";
import { SAVINGS_CONTRACT_ID, REGISTRY_CONTRACT_ID } from "@esustellar/shared";

export interface SdkConfig {
  rpcUrl: string;
  networkPassphrase: string;
}

export interface WriteConfig extends SdkConfig {
  contractId: string;
  publicKey: string;
  signTransaction: (tx: string) => Promise<string>;
}

export type GroupStatus = "Open" | "Active" | "Completed" | "Paused";
export type Frequency = "Daily" | "Weekly" | "BiWeekly" | "Monthly";

export interface SavingsGroup {
  group_id: string;
  admin: string;
  name: string;
  contribution_amount: bigint;
  total_members: number;
  frequency: Frequency;
  start_timestamp: bigint;
  status: GroupStatus;
  is_public: boolean;
  current_round: number;
  platform_fee_percent: number;
}

export interface CreateGroupParams {
  name: string;
  contributionAmount: bigint;
  totalMembers: number;
  frequency: Frequency;
  startTimestamp: bigint;
  isPublic: boolean;
}

async function invokeContract(
  config: WriteConfig,
  method: string,
  ...args: unknown[]
): Promise<string> {
  const server = new SorobanRpc.Api(config.rpcUrl);
  const contract = new Contract(config.contractId);

  const txBuilder = new TransactionBuilder(
    await server.getAccount(config.publicKey),
    {
      fee: BASE_FEE.toString(),
      networkPassphrase: config.networkPassphrase,
    }
  );

  const tx = txBuilder
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if ("error" in simulated) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  const prepared = await server.prepareTransaction(tx);
  const signedTx = await config.signTransaction(prepared.toXDR());

  const txResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedTx, config.networkPassphrase)
  );

  if (txResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(txResult.errorResult)}`);
  }

  // Poll for confirmation
  let result = txResult;
  while (result.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    result = await server.getTransaction(txResult.hash);
  }

  return txResult.hash;
}

async function simulateRead(
  config: SdkConfig,
  contractId: string,
  method: string,
  ...args: unknown[]
): Promise<unknown> {
  const server = new SorobanRpc.Api(config.rpcUrl);
  const contract = new Contract(contractId);

  const txBuilder = new TransactionBuilder(
    { accountId: config.publicKey || "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" },
    {
      fee: "0",
      networkPassphrase: config.networkPassphrase,
    }
  );

  const tx = txBuilder
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const result = await server.simulateTransaction(tx);
  if ("error" in result) {
    throw new Error(`Simulation failed: ${result.error}`);
  }

  return result;
}

// ── Savings Contract Methods ─────────────────────────────────────────

export async function createGroup(
  config: WriteConfig,
  params: CreateGroupParams
): Promise<string> {
  const contractId = config.contractId || SAVINGS_CONTRACT_ID;
  const fullConfig = { ...config, contractId };
  const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return invokeContract(
    fullConfig,
    "create_group",
    config.publicKey, // admin
    groupId,
    params.name,
    params.contributionAmount.toString(),
    params.totalMembers,
    params.frequency,
    params.startTimestamp.toString(),
    params.isPublic,
    config.publicKey, // treasury
    null, // token_address
    null  // allowed_members
  );
}

export async function joinGroup(
  config: WriteConfig,
  groupId: string
): Promise<string> {
  const contractId = config.contractId || SAVINGS_CONTRACT_ID;
  const fullConfig = { ...config, contractId };

  return invokeContract(
    fullConfig,
    "join_group",
    config.publicKey,
    groupId
  );
}

export async function contribute(
  config: WriteConfig,
  groupId: string
): Promise<string> {
  const contractId = config.contractId || SAVINGS_CONTRACT_ID;
  const fullConfig = { ...config, contractId };

  return invokeContract(
    fullConfig,
    "contribute",
    config.publicKey,
    groupId
  );
}

// ── Registry Contract Methods ────────────────────────────────────────

export interface RegisterGroupParams {
  contractAddress: string;
  groupId: string;
  name: string;
  admin: string;
  isPublic: boolean;
}

export async function registerGroup(
  config: WriteConfig,
  params: RegisterGroupParams
): Promise<string> {
  const contractId = config.contractId || REGISTRY_CONTRACT_ID;
  const fullConfig = { ...config, contractId };

  return invokeContract(
    fullConfig,
    "register_group",
    params.contractAddress,
    params.groupId,
    params.name,
    params.admin,
    params.isPublic
  );
}

export async function addMember(
  config: WriteConfig,
  contractAddress: string,
  member: string
): Promise<string> {
  const contractId = config.contractId || REGISTRY_CONTRACT_ID;
  const fullConfig = { ...config, contractId };

  return invokeContract(
    fullConfig,
    "add_member",
    contractAddress,
    member
  );
}
