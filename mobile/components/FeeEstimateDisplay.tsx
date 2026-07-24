/**
 * Fetches the current Stellar network base fee from Horizon and returns a
 * real-time estimate. Polls every 15 seconds and refreshes on demand.
 *
 * Stellar fee model:
 *   - Base fee: minimum fee per operation (currently 100 stroops = 0.00001 XLM)
 *   - Horizon /fee_stats returns p10/p50/p90/p99 accepted fee percentiles
 *   - We expose three tiers: slow (p10), standard (p50), fast (p90)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeeEstimate {
  /** Stroops per operation */
  slowStroops: number;
  standardStroops: number;
  fastStroops: number;
  /** XLM equivalents (1 XLM = 10_000_000 stroops) */
  slowXLM: string;
  standardXLM: string;
  fastXLM: string;
  /** Unix ms timestamp of last successful fetch */
  fetchedAt: number;
}

export interface UseStellarFeeResult {
  fee: FeeEstimate | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const HORIZON_MAINNET = 'https://horizon.stellar.org';
const STROOPS_PER_XLM = 10_000_000;
const POLL_INTERVAL_MS = 15_000;

// ─── Helper ───────────────────────────────────────────────────────────────────

function stroopsToXLM(stroops: number, decimals = 5): string {
  return (stroops / STROOPS_PER_XLM).toFixed(decimals);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStellarFee(
  network: 'testnet' | 'mainnet' = 'testnet',
  operationCount = 1,
): UseStellarFeeResult {
  const [fee, setFee] = useState<FeeEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const baseUrl = network === 'mainnet' ? HORIZON_MAINNET : HORIZON_TESTNET;

  const fetchFee = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/fee_stats`);
      if (!res.ok) throw new Error(`Horizon responded ${res.status}`);

      // Horizon fee_stats shape (simplified):
      // { fee_charged: { p10, p50, p90, p99 }, last_ledger_base_fee, ... }
      const data = (await res.json()) as {
        fee_charged: { p10: string; p50: string; p90: string };
        last_ledger_base_fee: string;
      };

      const p10 = parseInt(data.fee_charged.p10, 10) * operationCount;
      const p50 = parseInt(data.fee_charged.p50, 10) * operationCount;
      const p90 = parseInt(data.fee_charged.p90, 10) * operationCount;

      setFee({
        slowStroops: p10,
        standardStroops: p50,
        fastStroops: p90,
        slowXLM: stroopsToXLM(p10),
        standardXLM: stroopsToXLM(p50),
        fastXLM: stroopsToXLM(p90),
        fetchedAt: Date.now(),
      });
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch fee estimate',
      );
    } finally {
      setLoading(false);
    }
  }, [baseUrl, operationCount]);

  // Initial fetch + polling
  useEffect(() => {
    void fetchFee();
    timerRef.current = setInterval(() => void fetchFee(), POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchFee]);

  return { fee, loading, error, refresh: fetchFee };
}

// ─────────────────────────────────────────────────────────────────────────────
// FeeEstimateDisplay component
// Shows the three fee tiers before the user confirms a transaction.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState as useStateR } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FeeTier = 'slow' | 'standard' | 'fast';

interface FeeEstimateDisplayProps {
  network?: 'testnet' | 'mainnet';
  operationCount?: number;
  /** Called when the user selects a tier */
  onSelectTier?: (tier: FeeTier, stroops: number) => void;
}

export function FeeEstimateDisplay({
  network = 'testnet',
  operationCount = 1,
  onSelectTier,
}: FeeEstimateDisplayProps) {
  const { fee, loading, error, refresh } = useStellarFee(
    network,
    operationCount,
  );
  const [selected, setSelected] = useStateR<FeeTier>('standard');

  const handleSelect = (tier: FeeTier) => {
    setSelected(tier);
    if (fee) {
      const stroops =
        tier === 'slow'
          ? fee.slowStroops
          : tier === 'standard'
            ? fee.standardStroops
            : fee.fastStroops;
      onSelectTier?.(tier, stroops);
    }
  };

  const tiers: {
    key: FeeTier;
    label: string;
    emoji: string;
    xlm?: string;
    stroops?: number;
  }[] = [
    {
      key: 'slow',
      label: 'Economy',
      emoji: '🐢',
      xlm: fee?.slowXLM,
      stroops: fee?.slowStroops,
    },
    {
      key: 'standard',
      label: 'Standard',
      emoji: '⚡',
      xlm: fee?.standardXLM,
      stroops: fee?.standardStroops,
    },
    {
      key: 'fast',
      label: 'Priority',
      emoji: '🚀',
      xlm: fee?.fastXLM,
      stroops: fee?.fastStroops,
    },
  ];

  return (
    <View style={feeStyles.container}>
      <View style={feeStyles.header}>
        <Text style={feeStyles.title}>Network fee</Text>
        {fee && (
          <TouchableOpacity
              onPress={refresh}
              {...({ accessibilityLabel: 'Refresh fee estimate' } as any)}
            >
            <Text style={feeStyles.refreshBtn}>↻ Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !fee && (
        <View style={feeStyles.loadingRow}>
          <Text style={feeStyles.loadingSpinner}>⏳</Text>
          <Text style={feeStyles.loadingText}>Fetching live estimates…</Text>
        </View>
      )}

      {error && !fee && (
        <View style={feeStyles.errorRow}>
          <Text style={feeStyles.errorText}>⚠ {error}</Text>
          <TouchableOpacity onPress={refresh}>
            <Text style={feeStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {fee && (
        <>
          <View style={feeStyles.tiersRow}>
            {tiers.map((tier) => (
              <TouchableOpacity
                key={tier.key}
                style={[
                  feeStyles.tier,
                  selected === tier.key && feeStyles.tierSelected,
                ]}
                onPress={() => handleSelect(tier.key)}
                accessibilityLabel={`${tier.label} fee: ${tier.xlm} XLM`}
                accessibilityState={{ selected: selected === tier.key }}
              >
                <Text style={feeStyles.tierEmoji}>{tier.emoji}</Text>
                <Text
                  style={[
                    feeStyles.tierLabel,
                    selected === tier.key && feeStyles.tierLabelSelected,
                  ]}
                >
                  {tier.label}
                </Text>
                <Text
                  style={[
                    feeStyles.tierXLM,
                    selected === tier.key && feeStyles.tierXLMSelected,
                  ]}
                >
                  {tier.xlm} XLM
                </Text>
                <Text style={feeStyles.tierStroops}>
                  {tier.stroops} stroops
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={feeStyles.updatedAt}>
            Updated {new Date(fee.fetchedAt).toLocaleTimeString()} ·
            auto-refreshes every 15s
          </Text>
        </>
      )}
    </View>
  );
}

const feeStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  refreshBtn: { fontSize: 13, color: '#3B82F6' },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: { fontSize: 13, color: '#64748B' },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  errorText: { fontSize: 13, color: '#EF4444' },
  retryText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },

  tiersRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tier: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tierSelected: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  tierEmoji: { fontSize: 20, marginBottom: 4 },
  tierLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tierLabelSelected: { color: '#1D4ED8' },
  tierXLM: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 4 },
  tierXLMSelected: { color: '#1D4ED8' },
  tierStroops: { fontSize: 10, color: '#94A3B8', marginTop: 2 },

  updatedAt: { fontSize: 11, color: '#CBD5E1', textAlign: 'center' },
});
