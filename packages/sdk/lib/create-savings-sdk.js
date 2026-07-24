const { Contract, TransactionBuilder, BASE_FEE, rpc, Account } = require("@stellar/stellar-sdk");
const { asAddress, asString, asU32 } = require("./scalars");
const { mapGroup, mapMember, mapContribution } = require("./savings-models");
const { unwrapEnum, toBigInt } = require("./normalize");
const { SAVINGS_METHODS } = require("./contract-methods");

function createSavingsSdk({ contractId, networkPassphrase, rpcUrl, sourceAccount = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" }) {
  if (!contractId) throw new Error("contractId is required");
  if (!networkPassphrase) throw new Error("networkPassphrase is required");
  if (!rpcUrl) throw new Error("rpcUrl is required");

  const server = new rpc.Server(rpcUrl, { allowHttp: true });
  const contract = new Contract(contractId);

  async function simulate(method, ...args) {
    const tx = new TransactionBuilder(new Account(sourceAccount, "0"), {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(result)) throw new Error(result.error);
    if (!result.result) throw new Error("Simulation result empty");
    return result.result.retval;
  }

  return {
    async getGroup(groupId) {
      const n = require("@stellar/stellar-sdk").scValToNative(
        await simulate(SAVINGS_METHODS.GET_GROUP, asString(groupId)),
      );
      return mapGroup(n, unwrapEnum, toBigInt);
    },
    async getMember(member, groupId) {
      const n = require("@stellar/stellar-sdk").scValToNative(
        await simulate(SAVINGS_METHODS.GET_MEMBER, asAddress(member), asString(groupId)),
      );
      return mapMember(n, unwrapEnum, toBigInt);
    },
    async getMembers(groupId) {
      return require("@stellar/stellar-sdk").scValToNative(
        await simulate(SAVINGS_METHODS.GET_MEMBERS, asString(groupId)),
      );
    },
    async getRoundContributions(groupId, round) {
      const raw = require("@stellar/stellar-sdk").scValToNative(
        await simulate(
          SAVINGS_METHODS.GET_ROUND_CONTRIBUTIONS,
          asString(groupId),
          asU32(round),
        ),
      );
      return (raw ?? []).map((c) => mapContribution(c, toBigInt));
    },
    async getUserGroups(user) {
      return require("@stellar/stellar-sdk").scValToNative(
        await simulate(SAVINGS_METHODS.GET_USER_GROUPS, asAddress(user)),
      );
    },
  };
}

module.exports = { createSavingsSdk };
