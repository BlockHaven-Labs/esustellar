import { getAllGroups, SdkConfig } from "../get-all-groups";

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

const ADDR1 = "CSAVINGS001000000000000000000000000000000000000000000000";
const ADDR2 = "CSAVINGS002000000000000000000000000000000000000000000000";
const ADDR3 = "CSAVINGS003000000000000000000000000000000000000000000000";

function getSdk() {
  return jest.requireMock("@stellar/stellar-sdk") as any;
}

function makeMockServer(overrides: Record<string, jest.Mock> = {}) {
  const mockServer = { simulateTransaction: jest.fn(), ...overrides };
  getSdk().rpc.Server.mockImplementation(() => mockServer);
  return mockServer;
}

describe("getAllGroups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSdk().rpc.Api.isSimulationError.mockReturnValue(false);
  });

  it("returns an empty array when no groups are registered", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({
      result: { retval: "mock-retval" },
    });
    getSdk().scValToNative.mockReturnValueOnce([]);

    const result = await getAllGroups(config);

    expect(result).toEqual([]);
  });

  it("returns a list of contract addresses for registered groups", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({
      result: { retval: "mock-retval" },
    });
    getSdk().scValToNative.mockReturnValueOnce([ADDR1, ADDR2]);

    const result = await getAllGroups(config);

    expect(result).toEqual([ADDR1, ADDR2]);
  });

  it("list grows after each register_group call (simulated via successive calls)", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction
      .mockResolvedValueOnce({ result: { retval: "r1" } })
      .mockResolvedValueOnce({ result: { retval: "r2" } })
      .mockResolvedValueOnce({ result: { retval: "r3" } });

    getSdk().scValToNative
      .mockReturnValueOnce([ADDR1])
      .mockReturnValueOnce([ADDR1, ADDR2])
      .mockReturnValueOnce([ADDR1, ADDR2, ADDR3]);

    const list1 = await getAllGroups(config);
    const list2 = await getAllGroups(config);
    const list3 = await getAllGroups(config);

    expect(list1).toHaveLength(1);
    expect(list2).toHaveLength(2);
    expect(list3).toHaveLength(3);
    expect(list3).toContain(ADDR3);
  });

  it("includes both public and private group addresses", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({
      result: { retval: "mock-retval" },
    });
    getSdk().scValToNative.mockReturnValueOnce([ADDR1, ADDR2]);

    const result = await getAllGroups(config);

    // Both addresses returned — public/private distinction is not filtered here
    expect(result).toHaveLength(2);
  });

  it("maps Address values to strings", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({
      result: { retval: "mock-retval" },
    });
    getSdk().scValToNative.mockReturnValueOnce([ADDR1]);

    const result = await getAllGroups(config);

    expect(typeof result[0]).toBe("string");
  });

  it("calls get_all_groups on the correct contract", async () => {
    const { Contract } = getSdk();
    const mockCall = jest.fn().mockReturnValue("mock-op");
    Contract.mockImplementationOnce(() => ({ call: mockCall }));
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({
      result: { retval: "mock-retval" },
    });
    getSdk().scValToNative.mockReturnValueOnce([]);

    await getAllGroups(config);

    expect(Contract).toHaveBeenCalledWith(config.contractId);
    expect(mockCall).toHaveBeenCalledWith("get_all_groups");
  });

  it("throws on simulation error", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({ error: "HostError" });
    getSdk().rpc.Api.isSimulationError.mockReturnValueOnce(true);

    await expect(getAllGroups(config)).rejects.toThrow(
      "Registry contract simulation error: HostError",
    );
  });

  it("throws when simulation result is empty", async () => {
    const mockServer = makeMockServer();
    mockServer.simulateTransaction.mockResolvedValueOnce({ result: null });

    await expect(getAllGroups(config)).rejects.toThrow(
      "Simulation returned empty result",
    );
  });
});
