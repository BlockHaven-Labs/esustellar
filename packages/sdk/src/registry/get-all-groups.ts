import {
  Contract,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
  rpc,
  Account,
} from "@stellar/stellar-sdk";

const DUMMY_ACCOUNT =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export interface SdkConfig {
  /** Registry contract ID (Stellar address). */
  contractId: string;
  /** Soroban RPC endpoint URL. */
  rpcUrl: string;
  /** Network passphrase, e.g. "Test SDF Network ; September 2015". */
  networkPassphrase: string;
  /** Optional Stellar address used as the simulation source. Defaults to a dummy account. */
  sourceAccount?: string;
}

/**
 * Returns all registered group contract addresses (both public and private).
 * Maps the on-chain `Vec<Address>` return type to a `string[]`.
 *
 * This is a read-only simulation — no transaction is submitted and no auth is required.
 * The returned list grows by one each time `register_group` is successfully called.
 *
 * For public-only groups use `getAllPublicGroups`. For full metadata use `getAllGroupsInfo`.
 *
 * @throws {Error} If the simulation fails or returns an empty result.
 *
 * @example
 * ```ts
 * const addresses = await getAllGroups({
 *   contractId: "CREGISTRY...",
 *   rpcUrl: "https://soroban-testnet.stellar.org",
 *   networkPassphrase: "Test SDF Network ; September 2015",
 * });
 * console.log(addresses[0]); // "CSAVINGSCONTRACT..."
 * ```
 */
export async function getAllGroups(config: SdkConfig): Promise<string[]> {
  const { contractId, rpcUrl, networkPassphrase } = config;
  const source = config.sourceAccount ?? DUMMY_ACCOUNT;

  const server = new rpc.Server(rpcUrl, { allowHttp: true });
  const contract = new Contract(contractId);
  const account = new Account(source, "0");

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(contract.call("get_all_groups"))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx as any);

  if (rpc.Api.isSimulationError(result)) {
    throw new Error(
      `Registry contract simulation error: ${(result as any).error}`,
    );
  }

  const simResult = result as any;
  if (!simResult.result?.retval) {
    throw new Error("Simulation returned empty result");
  }

  const raw = scValToNative(simResult.result.retval) as string[];
  return raw.map(String);
}
