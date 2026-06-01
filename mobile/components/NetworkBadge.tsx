import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNetworkStore } from "../stores/networkStore";

/**
 * Compact badge that displays the active Stellar network.
 * Renders nothing on Mainnet to avoid cluttering the production UI.
 * Drop it in the app header or settings screen.
 *
 * @example
 * // In your header component:
 * <NetworkBadge />
 */
export default function NetworkBadge() {
  const { activeNetwork } = useNetworkStore();

  if (activeNetwork === "mainnet") return null;

  return (
    <View style={styles.badge} testID="network-badge">
      <Text style={styles.label}>TESTNET</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#F59E0B",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  label: {
    color: "#1C1917",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
