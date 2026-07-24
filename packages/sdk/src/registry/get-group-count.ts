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
 * Returns the total number of groups registered in the Registry contract.
 * Maps the on-chain `u32` return type to a JavaScript `number`.
 *
 * This is a read-only simulation — no transaction is submitted and no auth is required.
 * The count increments each time `register_group` is successfully called on-chain.
 *
 * @throws {Error} If the simulation fails or returns an empty result.
 *
 * @example
 * ```ts
 * const count = await getGroupCount({
 *   contractId: "CREGISTRY...",
 *   rpcUrl: "https://soroban-testnet.stellar.org",
 *   networkPassphrase: "Test SDF Network ; September 2015",
 * });
 * console.log(`${count} groups registered`);
 * ```
 */
export async function getGroupCount(config: SdkConfig): Promise<number> {
  const { contractId, rpcUrl, networkPassphrase } = config;
  const source = config.sourceAccount ?? DUMMY_ACCOUNT;

  const server = new rpc.Server(rpcUrl, { allowHttp: true });
  const contract = new Contract(contractId);
  const account = new Account(source, "0");

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(contract.call("get_group_count"))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx as any);

  if (rpc.Api.isSimulationError(result)) {
    throw new Error(
      `Registry contract simulation error: ${(result as any).error}`,
    );
  }

  const simResult = result as any;
  if (!("result" in simResult) || simResult.result == null) {
    throw new Error("Simulation returned empty result");
  }

  return Number(scValToNative(simResult.result.retval));
}
