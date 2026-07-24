import {
  Contract,
  nativeToScVal,
  TransactionBuilder,
  BASE_FEE,
  rpc,
} from "@stellar/stellar-sdk";

export interface SdkConfig {
  /** Savings contract ID (Stellar address). */
  contractId: string;
  /** Soroban RPC endpoint URL. */
  rpcUrl: string;
  /** Network passphrase, e.g. "Test SDF Network ; September 2015". */
  networkPassphrase: string;
}

export interface WriteConfig extends SdkConfig {
  /** Stellar public key of the member joining the group. */
  publicKey: string;
  /** Callback that signs the transaction XDR and returns the signed XDR string. */
  signTransaction: (xdr: string) => Promise<string>;
}

/**
 * Joins an open savings group on-chain as the authenticated member.
 *
 * The member must not already be in the group and the group must still be
 * accepting new members (`GroupStatus::Open`) with available slots.
 *
 * **Error variants surfaced by the contract:**
 * - `GroupNotFound` — no group exists for the given `groupId`
 * - `GroupNotAcceptingMembers` — group status is not `Open`
 * - `GroupIsFull` — all member slots are already taken
 * - `AlreadyMember` — caller is already a member of this group
 *
 * @throws {Error} On contract validation failure, transaction rejection, or RPC error.
 *
 * @example
 * ```ts
 * await joinGroup(
 *   { contractId, rpcUrl, networkPassphrase, publicKey, signTransaction },
 *   "ajo-001",
 * );
 * ```
 */
export async function joinGroup(
  config: WriteConfig,
  groupId: string,
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const { contractId, rpcUrl, networkPassphrase, publicKey, signTransaction } = config;

  const server = new rpc.Server(rpcUrl, { allowHttp: true });
  const contract = new Contract(contractId);
  const account = await server.getAccount(publicKey);

  let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(
      contract.call(
        "join_group",
        nativeToScVal(publicKey, { type: "address" }),
        nativeToScVal(groupId, { type: "string" }),
      ),
    )
    .setTimeout(30)
    .build();

  tx = await server.prepareTransaction(tx as any);

  const signedXdr = await signTransaction((tx as any).toXDR());
  const preparedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  const sendResp = await server.sendTransaction(preparedTx as any);
  if (sendResp.status !== "PENDING") {
    throw new Error(`Transaction not accepted by network: ${sendResp.status}`);
  }

  let getResp = await server.getTransaction(sendResp.hash);
  while (getResp.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((r) => setTimeout(r, 1000));
    getResp = await server.getTransaction(sendResp.hash);
  }

  if (getResp.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return getResp as rpc.Api.GetSuccessfulTransactionResponse;
  }

  throw new Error(`join_group transaction failed: ${getResp.status}`);
}
