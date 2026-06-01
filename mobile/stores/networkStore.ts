import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NetworkService, StellarNetwork, NetworkConfig, NETWORK_CONFIGS } from "../services/stellar/network";

export interface NetworkState {
  /** The persisted network preference. */
  activeNetwork: StellarNetwork;
  /** Full config derived from activeNetwork. */
  config: NetworkConfig;
  /** Switch to a different network and persist the choice. */
  switchNetwork: (network: StellarNetwork) => void;
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set) => ({
      activeNetwork: "testnet",
      config: NETWORK_CONFIGS.testnet,

      switchNetwork: (network: StellarNetwork) => {
        const config = NetworkService.getInstance().switchNetwork(network);
        set({ activeNetwork: network, config });
      },
    }),
    {
      name: "esustellar-network",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ activeNetwork: state.activeNetwork }),
      onRehydrateStorage: () => (state) => {
        if (state?.activeNetwork) {
          // Re-apply persisted network to the service singleton on app start.
          NetworkService.getInstance().switchNetwork(state.activeNetwork);
          state.config = NETWORK_CONFIGS[state.activeNetwork];
        }
      },
    },
  ),
);
