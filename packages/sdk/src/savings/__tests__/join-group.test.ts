import { joinGroup, WriteConfig } from "../join-group";

jest.mock("@stellar/stellar-sdk", () => {
  const TransactionBuilderMock: any = jest.fn().mockImplementation(() => ({
    addOperation: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      toXDR: jest.fn().mockReturnValue("built-xdr"),
    }),
  }));
  TransactionBuilderMock.fromXDR = jest.fn().mockReturnValue("prepared-tx-obj");

  return {
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockReturnValue("mock-op"),
    })),
    BASE_FEE: "100",
    TransactionBuilder: TransactionBuilderMock,
    rpc: {
      Server: jest.fn(),
      Api: {
        isSimulationError: jest.fn(),
        GetTransactionStatus: { NOT_FOUND: "NOT_FOUND", SUCCESS: "SUCCESS" },
      },
    },
    nativeToScVal: jest.fn().mockReturnValue("mock-scval"),
  };
});

function getSdk() {
  return jest.requireMock("@stellar/stellar-sdk") as any;
}

function makeMockServer(overrides: Record<string, jest.Mock> = {}) {
  const mockServer = {
    getAccount: jest.fn().mockResolvedValue({ id: "GPUBKEY", sequence: "100" }),
    prepareTransaction: jest.fn().mockResolvedValue({
      toXDR: jest.fn().mockReturnValue("prepared-xdr"),
    }),
    sendTransaction: jest.fn().mockResolvedValue({ status: "PENDING", hash: "txhash123" }),
    getTransaction: jest.fn().mockResolvedValue({ status: "SUCCESS" }),
    ...overrides,
  };
  getSdk().rpc.Server.mockImplementation(() => mockServer);
  return mockServer;
}

const signTransaction = jest.fn().mockResolvedValue("signed-xdr");

const config: WriteConfig = {
  contractId: "CSAVINGSCONTRACTID00000000000000000000000000000000000",
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  publicKey: "GMEMBER000000000000000000000000000000000000000000000000",
  signTransaction,
};

const GROUP_ID = "ajo-001";

describe("joinGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signTransaction.mockResolvedValue("signed-xdr");
  });

  it("returns the successful transaction response on a valid join", async () => {
    const mockServer = makeMockServer();

    const result = await joinGroup(config, GROUP_ID);

    expect(result).toEqual({ status: "SUCCESS" });
    expect(mockServer.sendTransaction).toHaveBeenCalledTimes(1);
    expect(mockServer.getTransaction).toHaveBeenCalledWith("txhash123");
  });

  it("calls join_group with member address and group_id", async () => {
    const { Contract, nativeToScVal } = getSdk();
    const mockCall = jest.fn().mockReturnValue("mock-op");
    Contract.mockImplementationOnce(() => ({ call: mockCall }));
    makeMockServer();

    await joinGroup(config, GROUP_ID);

    expect(mockCall).toHaveBeenCalledWith(
      "join_group",
      expect.anything(), // member
      expect.anything(), // group_id
    );
    expect(nativeToScVal).toHaveBeenCalledWith(config.publicKey, { type: "address" });
    expect(nativeToScVal).toHaveBeenCalledWith(GROUP_ID, { type: "string" });
  });

  it("passes the signed XDR to fromXDR", async () => {
    makeMockServer();
    const { TransactionBuilder } = getSdk();

    await joinGroup(config, GROUP_ID);

    expect(signTransaction).toHaveBeenCalledWith("prepared-xdr");
    expect(TransactionBuilder.fromXDR).toHaveBeenCalledWith(
      "signed-xdr",
      config.networkPassphrase,
    );
  });

  it("throws GroupNotFound when prepareTransaction rejects with that error", async () => {
    makeMockServer({
      prepareTransaction: jest.fn().mockRejectedValueOnce(
        new Error("HostError: Error(Contract, #4)"),
      ),
    });

    await expect(joinGroup(config, "nonexistent-group")).rejects.toThrow(
      "HostError: Error(Contract, #4)",
    );
  });

  it("throws GroupNotAcceptingMembers when group is not Open", async () => {
    makeMockServer({
      prepareTransaction: jest.fn().mockRejectedValueOnce(
        new Error("HostError: Error(Contract, #5)"),
      ),
    });

    await expect(joinGroup(config, GROUP_ID)).rejects.toThrow(
      "HostError: Error(Contract, #5)",
    );
  });

  it("throws GroupIsFull when all slots are taken", async () => {
    makeMockServer({
      prepareTransaction: jest.fn().mockRejectedValueOnce(
        new Error("HostError: Error(Contract, #6)"),
      ),
    });

    await expect(joinGroup(config, GROUP_ID)).rejects.toThrow(
      "HostError: Error(Contract, #6)",
    );
  });

  it("throws AlreadyMember when the caller is already in the group", async () => {
    makeMockServer({
      prepareTransaction: jest.fn().mockRejectedValueOnce(
        new Error("HostError: Error(Contract, #7)"),
      ),
    });

    await expect(joinGroup(config, GROUP_ID)).rejects.toThrow(
      "HostError: Error(Contract, #7)",
    );
  });

  it("throws when the network does not accept the transaction", async () => {
    makeMockServer({
      sendTransaction: jest.fn().mockResolvedValueOnce({ status: "ERROR", hash: "h" }),
    });

    await expect(joinGroup(config, GROUP_ID)).rejects.toThrow(
      "Transaction not accepted by network: ERROR",
    );
  });

  it("throws when the confirmed transaction has a FAILED status", async () => {
    makeMockServer({
      getTransaction: jest.fn().mockResolvedValueOnce({ status: "FAILED" }),
    });

    await expect(joinGroup(config, GROUP_ID)).rejects.toThrow(
      "join_group transaction failed: FAILED",
    );
  });

  it("polls until getTransaction leaves NOT_FOUND", async () => {
    const getTransaction = jest
      .fn()
      .mockResolvedValueOnce({ status: "NOT_FOUND" })
      .mockResolvedValueOnce({ status: "SUCCESS" });

    makeMockServer({ getTransaction });

    jest.useFakeTimers();
    const promise = joinGroup(config, GROUP_ID);
    await jest.runAllTimersAsync();
    const result = await promise;
    jest.useRealTimers();

    expect(getTransaction).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ status: "SUCCESS" });
  });
});
