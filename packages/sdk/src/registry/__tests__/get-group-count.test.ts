import { getGroupCount, SdkConfig } from "../get-group-count";

jest.mock("@stellar/stellar-sdk", () => {
  const TransactionBuilderMock: any = jest.fn().mockImplementation(() => ({
    addOperation: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({ toXDR: jest.fn().mockReturnValue("mock-xdr") }),
  }));
  TransactionBuilderMock.fromXDR = jest.fn();

  return {
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockReturnValue("mock-op"),
    })),
    Account: jest.fn().mockImplementation(() => ({})),
    BASE_FEE: "100",
    TransactionBuilder: TransactionBuilderMock,
    rpc: {
      Server: jest.fn(),
      Api: {
        isSimulationError: jest.fn(),
        GetTransactionStatus: { NOT_FOUND: "NOT_FOUND", SUCCESS: "SUCCESS" },
      },
    },
    scValToNative: jest.fn(),
    nativeToScVal: jest.fn().mockReturnValue("mock-scval"),
  };
});

const config: SdkConfig = {
  contractId: "CREGISTRYCONTRACTID000000000000000000000000000000000000",
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
};

function getSdk() {
  return jest.requireMock("@stellar/stellar-sdk") as any;
}

function makeMockServer(overrides: Record<string, jest.Mock> = {}) {
  const mockServer = { simulateTransaction: jest.fn(), ...overrides };
  getSdk().rpc.Server.mockImplementation(() => mockServer);
  return mockServer;
}

describe("getGroupCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSdk().rpc.Api.isSimulationError.mockReturnValue(false);
  });

  it("returns 0 when no groups have been registered", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({
      result: { retval: "mock-retval" },
    });
    getSdk().scValToNative.mockReturnValueOnce(0);

    const count = await getGroupCount(config);

    expect(count).toBe(0);
  });

  it("returns the correct count after one registration", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({
      result: { retval: "mock-retval" },
    });
    getSdk().scValToNative.mockReturnValueOnce(1);

    const count = await getGroupCount(config);

    expect(count).toBe(1);
  });

  it("count increments with each register_group call (simulated via successive calls)", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction
      .mockResolvedValueOnce({ result: { retval: "r1" } })
      .mockResolvedValueOnce({ result: { retval: "r2" } })
      .mockResolvedValueOnce({ result: { retval: "r3" } });

    getSdk().scValToNative
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3);

    const c1 = await getGroupCount(config);
    const c2 = await getGroupCount(config);
    const c3 = await getGroupCount(config);

    expect(c1).toBe(1);
    expect(c2).toBe(2);
    expect(c3).toBe(3);
  });

  it("maps u32 to a JavaScript number", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({
      result: { retval: "mock-retval" },
    });
    getSdk().scValToNative.mockReturnValueOnce(42);

    const count = await getGroupCount(config);

    expect(typeof count).toBe("number");
    expect(count).toBe(42);
  });

  it("calls get_group_count on the correct contract", async () => {
    const { Contract } = getSdk();
    const mockCall = jest.fn().mockReturnValue("mock-op");
    Contract.mockImplementationOnce(() => ({ call: mockCall }));
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({
      result: { retval: "mock-retval" },
    });
    getSdk().scValToNative.mockReturnValueOnce(5);

    await getGroupCount(config);

    expect(Contract).toHaveBeenCalledWith(config.contractId);
    expect(mockCall).toHaveBeenCalledWith("get_group_count");
  });

  it("throws on simulation error", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({ error: "HostError" });
    getSdk().rpc.Api.isSimulationError.mockReturnValueOnce(true);

    await expect(getGroupCount(config)).rejects.toThrow(
      "Registry contract simulation error: HostError",
    );
  });

  it("throws when simulation result is empty", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({ result: null });

    await expect(getGroupCount(config)).rejects.toThrow(
      "Simulation returned empty result",
    );
  });
});
