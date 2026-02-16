"use client";

import * as React from "react";
import {
  Contract,
  xdr,
  scValToNative,
  nativeToScVal,
  TransactionBuilder,
  BASE_FEE,
  rpc,
  Account,
} from "@stellar/stellar-sdk";
import { useWallet } from "@/hooks/use-wallet";
import {
  SOROBAN_NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
} from "@/config/walletConfig";

export interface GroupInfo {
  contract_address: string;
  group_id: string;
  name: string;
  admin: string;
  is_public: boolean;
  created_at: number;
  total_members: number;
}

export interface RegisterGroupParams {
  contractAddress: string;
  groupId: string;
  name: string;
  admin: string;
  isPublic: boolean;
  totalMembers: number;
}

export interface RegistryContractContextValue {
  getUserGroups: (userAddress: string) => Promise<string[]>;
  getGroupInfo: (contractAddress: string) => Promise<GroupInfo>;
  getAllPublicGroups: () => Promise<GroupInfo[]>;
  getAllGroups: () => Promise<string[]>;
  getGroupCount: () => Promise<number>;
  contractId: string;
  isReady: boolean;
  error: string | null;
  registerGroup: (
    params: RegisterGroupParams,
  ) => Promise<rpc.Api.GetSuccessfulTransactionResponse>;
  addMember: (
    contractAddress: string,
    member: string,
  ) => Promise<rpc.Api.GetSuccessfulTransactionResponse>;
}

const RegistryContractContext = React.createContext<
  RegistryContractContextValue | undefined
>(undefined);

export function RegistryContractProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallet = useWallet();
  const contractId = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID || "";
  const [error, setError] = React.useState<string | null>(null);

  const isReady = !!contractId && !!SOROBAN_RPC_URL;

  const server = React.useMemo(
    () => new rpc.Server(SOROBAN_RPC_URL, { allowHttp: true }),
    [],
  );

  const sendTransaction = React.useCallback(
    async (method: string, ...args: xdr.ScVal[]) => {
      if (!wallet.publicKey) throw new Error("Wallet not connected");

      const contract = new Contract(contractId);
      const account = await server.getAccount(wallet.publicKey);

      let tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      tx = await server.prepareTransaction(tx);
      const signedXdr = await wallet.signTransaction(tx.toXDR());

      const transactionToSubmit = TransactionBuilder.fromXDR(
        signedXdr,
        SOROBAN_NETWORK_PASSPHRASE,
      );
      const response = await server.sendTransaction(transactionToSubmit);

      if (response.status !== "PENDING") {
        throw new Error(`Transaction failed: ${response.status}`);
      }

      let getResponse = await server.getTransaction(response.hash);

      while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(response.hash);
      }

      if (getResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return getResponse;
      }

      throw new Error(`Transaction failed: ${getResponse.status}`);
    },
    [wallet, contractId, server],
  );

  const registerGroup = React.useCallback(
    async (params: RegisterGroupParams) => {
      if (!wallet.publicKey) throw new Error("Wallet not connected");

      return await sendTransaction(
        "register_group",
        nativeToScVal(params.contractAddress, { type: "address" }),
        nativeToScVal(params.groupId, { type: "string" }),
        nativeToScVal(params.name, { type: "string" }),
        nativeToScVal(params.admin, { type: "address" }),
        nativeToScVal(params.isPublic, { type: "bool" }),
        nativeToScVal(params.totalMembers, { type: "u32" }),
      );
    },
    [wallet.publicKey, sendTransaction],
  );

  const addMember = React.useCallback(
    async (contractAddress: string, member: string) => {
      if (!wallet.publicKey) throw new Error("Wallet not connected");

      return await sendTransaction(
        "add_member",
        nativeToScVal(contractAddress, { type: "address" }),
        nativeToScVal(member, { type: "address" }),
      );
    },
    [wallet.publicKey, sendTransaction],
  );

  const simulateCall = React.useCallback(
    async (method: string, ...args: xdr.ScVal[]): Promise<xdr.ScVal> => {
      const source =
        wallet.publicKey ||
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
      const contract = new Contract(contractId);

      const sourceAccount = new Account(source, "0");

      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      const result = await server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(result)) throw new Error(result.error);
      if (!result.result) throw new Error("Simulation result empty");
      return result.result.retval;
    },
    [wallet.publicKey, contractId, server],
  );

  const getUserGroups = React.useCallback(
    async (userAddress: string): Promise<string[]> => {
      const res = await simulateCall(
        "get_user_groups",
        nativeToScVal(userAddress, { type: "address" }),
      );
      return scValToNative(res) as string[];
    },
    [simulateCall],
  );

  const getGroupInfo = React.useCallback(
    async (contractAddress: string): Promise<GroupInfo> => {
      const res = await simulateCall(
        "get_group_info",
        nativeToScVal(contractAddress, { type: "address" }),
      );
      return scValToNative(res) as GroupInfo;
    },
    [simulateCall],
  );

  const getAllPublicGroups = React.useCallback(async (): Promise<
    GroupInfo[]
  > => {
    const res = await simulateCall("get_all_public_groups");
    return scValToNative(res) as GroupInfo[];
  }, [simulateCall]);

  const getAllGroups = React.useCallback(async (): Promise<string[]> => {
    const res = await simulateCall("get_all_groups");
    return scValToNative(res) as string[];
  }, [simulateCall]);

  const getGroupCount = React.useCallback(async (): Promise<number> => {
    const res = await simulateCall("get_group_count");
    return scValToNative(res) as number;
  }, [simulateCall]);

  const value = React.useMemo(
    () => ({
      getUserGroups,
      getGroupInfo,
      getAllPublicGroups,
      getAllGroups,
      getGroupCount,
      registerGroup,
      addMember,
      contractId,
      isReady,
      error,
    }),
    [
      getUserGroups,
      getGroupInfo,
      getAllPublicGroups,
      getAllGroups,
      getGroupCount,
      registerGroup,
      addMember,
      contractId,
      isReady,
      error,
    ],
  );

  return (
    <RegistryContractContext.Provider value={value}>
      {children}
    </RegistryContractContext.Provider>
  );
}

export const useRegistryContract = () => {
  const ctx = React.useContext(RegistryContractContext);
  if (!ctx)
    throw new Error(
      "useRegistryContract must be used within RegistryContractProvider",
    );
  return ctx;
};
