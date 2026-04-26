import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Button from '../../components/ui/Button';

type TxType = 'contribution' | 'payout' | 'fee';

type RiskLevel = 'high' | 'medium';

type RiskItem = {
  title: string;
  description: string;
  level: RiskLevel;
};

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

  const numericFee = Number.parseFloat(fee);
  const riskItems = useMemo<RiskItem[]>(() => {
    const items: RiskItem[] = [];

    if (!destination) {
      items.push({
        title: 'Recipient missing',
        description:
          'No destination account is set. Cancel if this was not intentional.',
        level: 'high',
      });
    }

    if (Number.isFinite(numericFee) && numericFee > 0.01) {
      items.push({
        title: 'High network fee',
        description: 'The fee is higher than usual. Verify before you sign.',
        level: 'medium',
      });
    }

    if (memo.length > 28) {
      items.push({
        title: 'Long memo',
        description:
          'Long memos are easy to mistype and may change payment routing.',
        level: 'medium',
      });
    }

    if (items.length === 0) {
      items.push({
        title: 'No obvious risks found',
        description:
          'Always verify the recipient and amount because blockchain payments are irreversible.',
        level: 'medium',
      });
    }

    return items;
  }, [destination, memo.length, numericFee]);

  const [submitting, setSubmitting] = useState(false);
  const [recipientChecked, setRecipientChecked] = useState(false);
  const [irreversibleChecked, setIrreversibleChecked] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);

  const canProceed = recipientChecked && irreversibleChecked;

  const handleContinue = () => {
    if (!canProceed) return;
    setReviewComplete(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Confirm Transaction</Text>
        <Text style={styles.subtitle}>Review every detail before signing.</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transaction Summary</Text>
          <Divider />
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Risk Check</Text>
          {riskItems.map((risk) => (
            <View
              key={risk.title}
              style={[
                styles.riskItem,
                risk.level === 'high' ? styles.riskHigh : styles.riskMedium,
              ]}
            >
              <Text style={styles.riskTitle}>{risk.title}</Text>
              <Text style={styles.riskDescription}>{risk.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Confirmation Step</Text>
          <CheckRow
            label="I verified the recipient wallet address"
            checked={recipientChecked}
            onToggle={() => setRecipientChecked((prev) => !prev)}
          />
          <CheckRow
            label="I understand this transaction cannot be reversed"
            checked={irreversibleChecked}
            onToggle={() => setIrreversibleChecked((prev) => !prev)}
          />
        </View>
      </ScrollView>

      <View style={styles.actions}>
        {submitting ? (
          <View style={styles.spinner}>
            <ActivityIndicator color="#6366F1" size="large" />
            <Text style={styles.spinnerText}>Submitting transaction…</Text>
          </View>
        ) : reviewComplete ? (
          <>
            <Button
              variant="primary"
              size="lg"
              onPress={handleConfirm}
              style={styles.btn}
            >
              Sign and Submit
            </Button>
            <Button
              variant="outline"
              size="lg"
              onPress={handleCancel}
              style={styles.btn}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              size="lg"
              onPress={handleContinue}
              style={styles.btn}
              disabled={!canProceed}
            >
              Continue to Signing
            </Button>
            <Button
              variant="outline"
              size="lg"
              onPress={handleCancel}
              style={styles.btn}
            >
              Cancel
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={styles.checkRow} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        <Text style={styles.checkboxIcon}>{checked ? '✓' : ''}</Text>
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
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
  content: { padding: 24, gap: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#F8FAFC', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 8 },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
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
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    textAlign: 'right',
    flex: 1,
    paddingLeft: 12,
  },
  rowValueHighlight: { color: '#4ADE80', fontSize: 18 },
  rowValueWarn: { color: '#F59E0B' },
  rowValueMono: { fontFamily: 'monospace', fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#334155' },
  riskItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  riskHigh: { borderColor: '#EF4444', backgroundColor: '#450A0A' },
  riskMedium: { borderColor: '#F59E0B', backgroundColor: '#422006' },
  riskTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  riskDescription: { color: '#CBD5E1', fontSize: 13, lineHeight: 18 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#64748B',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  checkboxIcon: { color: '#FFFFFF', fontWeight: '900' },
  checkLabel: { color: '#E2E8F0', fontSize: 14, flex: 1 },
  actions: { padding: 24, gap: 12 },
  btn: { width: '100%' },
  spinner: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  spinnerText: { color: '#94A3B8', fontSize: 14 },
});
