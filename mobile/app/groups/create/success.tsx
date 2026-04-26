import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Button from '../../../components/ui/Button';

export default function GroupCreatedSuccess() {
  const router = useRouter();
  const { groupId, inviteCode, groupName } = useLocalSearchParams<{
    groupId: string;
    inviteCode: string;
    groupName: string;
  }>();

  const code = inviteCode ?? 'ESU-ABCD-1234';
  const id = groupId ?? 'new';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', 'Invite code copied to clipboard.');
  };

  const handleShare = async () => {
    await Share.share({ message: `Join my EsuStellar savings group with code: ${code}` });
  };

  const handleViewGroup = () => {
    router.replace(`/groups/${id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.headline}>Group Created!</Text>
        {!!groupName && <Text style={styles.subtext}>{groupName}</Text>}

        <Text style={styles.codeLabel}>Your Invite Code</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{code}</Text>
        </View>

        <Button onPress={handleCopy} variant="outline" style={styles.actionBtn}>
          Copy Invite Code
        </Button>
        <Button onPress={handleShare} variant="secondary" style={styles.actionBtn}>
          Share Invite Code
        </Button>
        <Button onPress={handleViewGroup} style={styles.actionBtn}>
          View My Group
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: { fontSize: 64, marginBottom: 16 },
  headline: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtext: { fontSize: 16, color: '#94A3B8', marginBottom: 24 },
  codeLabel: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  codeBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  actionBtn: { width: '100%', marginBottom: 12 },
});
