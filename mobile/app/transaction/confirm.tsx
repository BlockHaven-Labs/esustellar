import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Button from '../../components/ui/Button';

type TxType = 'contribution' | 'payout' | 'fee';

const TYPE_LABEL: Record<TxType, string> = {
  contribution: 'Contribution',
  payout: 'Payout',
  fee: 'Fee',
};

function truncate(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function TransactionConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    amount?: string;
    destination?: string;
    fee?: string;
    memo?: string;
  }>();

  const type = (params.type ?? 'contribution') as TxType;
  const amount = params.amount ?? '0';
  const destination = params.destination ?? '';
  const fee = params.fee ?? '0.00001';
  const memo = params.memo ?? '';

  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    // Simulate signing + submission; replace with real Stellar tx logic
    await new Promise((r) => setTimeout(r, 1500));
    router.replace({
      pathname: '/transaction/success',
      params: { txHash: 'mock_tx_hash_' + Date.now() },
    });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Confirm Transaction</Text>
        <Text style={styles.subtitle}>
          Review the details below before signing.
        </Text>

        <View style={styles.card}>
          <Row label="Type" value={TYPE_LABEL[type] ?? type} />
          <Divider />
          <Row label="You are sending" value={`${amount} XLM`} highlight />
          <Divider />
          {destination ? (
            <>
              <Row label="To" value={truncate(destination)} mono />
              <Divider />
            </>
          ) : null}
          <Row label="Network Fee" value={`${fee} XLM`} warn />
          {memo ? (
            <>
              <Divider />
              <Row label="Memo" value={memo} />
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        {submitting ? (
          <View style={styles.spinner}>
            <ActivityIndicator color="#6366F1" size="large" />
            <Text style={styles.spinnerText}>Submitting transaction…</Text>
          </View>
        ) : (
          <>
            <Button variant="primary" size="lg" onPress={handleConfirm} style={styles.btn}>
              Confirm and Sign
            </Button>
            <Button variant="outline" size="lg" onPress={handleCancel} style={styles.btn}>
              Cancel
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  highlight,
  warn,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          highlight && styles.rowValueHighlight,
          warn && styles.rowValueWarn,
          mono && styles.rowValueMono,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#F8FAFC', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 24 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowLabel: { fontSize: 14, color: '#94A3B8' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#F8FAFC', textAlign: 'right', flex: 1, paddingLeft: 12 },
  rowValueHighlight: { color: '#4ADE80', fontSize: 18 },
  rowValueWarn: { color: '#F59E0B' },
  rowValueMono: { fontFamily: 'monospace', fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#334155' },
  actions: { padding: 24, gap: 12 },
  btn: { width: '100%' },
  spinner: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  spinnerText: { color: '#94A3B8', fontSize: 14 },
});
