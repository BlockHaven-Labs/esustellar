'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '../../components/ui/Avatar';
import { MemberAvatarStack } from '../../components/groups/MemberAvatarStack';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Card } from '../../components/ui/Card';
import { Divider } from '../../components/ui/Divider';

interface Member {
  address: string;
  name?: string;
  contributionAmount?: number;
  contributedAt?: string;
}

interface Contribution {
  id: string;
  memberAddress: string;
  memberName?: string;
  amount: number;
  timestamp: string;
  type: 'contribution' | 'payout';
}

interface PayoutSchedule {
  round: number;
  recipient: string;
  recipientName?: string;
  amount: number;
  date: string;
  status: 'upcoming' | 'completed' | 'pending';
}

interface GroupData {
  id: string;
  name: string;
  description: string;
  contractAddress: string;
  contributionAmount: number;
  payoutFrequency: string;
  maxMembers: number;
  createdAt: string;
  rules: string[];
  members: Member[];
  contributions: Contribution[];
  payoutSchedule: PayoutSchedule[];
  isCreator: boolean;
  currentUserAddress: string;
}

export default function GroupDetailScreen({ params }: { params: { groupId: string } }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockGroup: GroupData = {
      id: params.groupId,
      name: 'Family Savings Circle',
      description: 'A savings group for family members to save together and support each other',
      contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
      contributionAmount: 100,
      payoutFrequency: 'monthly',
      maxMembers: 10,
      createdAt: '2024-01-15',
      rules: [
        'Each member contributes $100 monthly',
        'Payouts rotate equally among all members',
        'Members must contribute on time to remain eligible',
        'Emergency withdrawals require majority vote'
      ],
      members: [
        { address: '0x1234...5678', name: 'John Doe', contributionAmount: 100, contributedAt: '2024-04-01' },
        { address: '0xabcd...ef12', name: 'Jane Smith', contributionAmount: 100, contributedAt: '2024-04-01' },
        { address: '0x5678...9012', name: 'Mike Johnson', contributionAmount: 100, contributedAt: '2024-04-02' },
        { address: '0xdef0...3456', name: 'Sarah Williams', contributionAmount: 100, contributedAt: '2024-04-03' },
        { address: '0x7890...1234', name: 'Tom Brown', contributionAmount: 100, contributedAt: '2024-04-03' },
        { address: '0x3456...7890', name: 'Emily Davis', contributionAmount: 100, contributedAt: '2024-04-04' },
      ],
      contributions: [
        { id: '1', memberAddress: '0x1234...5678', memberName: 'John Doe', amount: 100, timestamp: '2024-04-01', type: 'contribution' },
        { id: '2', memberAddress: '0xabcd...ef12', memberName: 'Jane Smith', amount: 100, timestamp: '2024-04-01', type: 'contribution' },
        { id: '3', memberAddress: '0x5678...9012', memberName: 'Mike Johnson', amount: 100, timestamp: '2024-04-02', type: 'contribution' },
        { id: '4', memberAddress: '0xdef0...3456', memberName: 'Sarah Williams', amount: 100, timestamp: '2024-04-03', type: 'contribution' },
        { id: '5', memberAddress: '0x7890...1234', memberName: 'Tom Brown', amount: 100, timestamp: '2024-04-03', type: 'contribution' },
        { id: '6', memberAddress: '0x3456...7890', memberName: 'Emily Davis', amount: 100, timestamp: '2024-04-04', type: 'contribution' },
      ],
      payoutSchedule: [
        { round: 1, recipient: '0x1234...5678', recipientName: 'John Doe', amount: 600, date: '2024-05-01', status: 'upcoming' },
        { round: 2, recipient: '0xabcd...ef12', recipientName: 'Jane Smith', amount: 600, date: '2024-06-01', status: 'pending' },
        { round: 3, recipient: '0x5678...9012', recipientName: 'Mike Johnson', amount: 600, date: '2024-07-01', status: 'pending' },
      ],
      isCreator: true,
      currentUserAddress: '0x1234...5678'
    };

    setTimeout(() => {
      setGroup(mockGroup);
      setLoading(false);
    }, 1000);
  }, [params.groupId]);

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join our savings group "${group?.name}"! Use invite code: ${group?.id}`,
        title: 'Invite to Savings Group'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share invite');
    }
  };

  const handleCopyAddress = () => {
    // Copy contract address to clipboard
    Alert.alert('Success', 'Contract address copied to clipboard');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading group details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShareInvite} style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Group Info */}
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDescription}>{group.description}</Text>
          <View style={styles.groupStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{group.members.length}/{group.maxMembers}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>${group.contributionAmount}</Text>
              <Text style={styles.statLabel}>Contribution</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{group.payoutFrequency}</Text>
              <Text style={styles.statLabel}>Frequency</Text>
            </View>
          </View>
        </View>

        {/* Members */}
        <SectionHeader title="Members" />
        <Card style={styles.card}>
          <MemberAvatarStack 
            members={group.members}
            onViewAll={() => router.push(`/groups/${group.id}/members`)}
          />
        </Card>

        {/* Payout Schedule */}
        <SectionHeader title="Payout Schedule" />
        <Card style={styles.card}>
          {group.payoutSchedule.map((payout, index) => (
            <View key={payout.round}>
              <View style={styles.payoutItem}>
                <View style={styles.payoutInfo}>
                  <Text style={styles.payoutRound}>Round {payout.round}</Text>
                  <Text style={styles.payoutRecipient}>{payout.recipientName || payout.recipient}</Text>
                  <Text style={styles.payoutDate}>{payout.date}</Text>
                </View>
                <View style={styles.payoutAmount}>
                  <Text style={styles.amount}>${payout.amount}</Text>
                  <View style={[styles.statusBadge, styles[payout.status]]}>
                    <Text style={styles.statusText}>{payout.status}</Text>
                  </View>
                </View>
              </View>
              {index < group.payoutSchedule.length - 1 && <Divider />}
            </View>
          ))}
        </Card>

        {/* Contribution History */}
        <SectionHeader title="Contribution History" />
        <Card style={styles.card}>
          {group.contributions.slice(0, 5).map((contribution, index) => (
            <View key={contribution.id}>
              <View style={styles.contributionItem}>
                <View style={styles.contributionInfo}>
                  <Text style={styles.contributor}>{contribution.memberName || contribution.memberAddress}</Text>
                  <Text style={styles.contributionDate}>{contribution.timestamp}</Text>
                </View>
                <Text style={styles.contributionAmount}>${contribution.amount}</Text>
              </View>
              {index < Math.min(5, group.contributions.length) - 1 && <Divider />}
            </View>
          ))}
          {group.contributions.length > 5 && (
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Contributions</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Group Rules */}
        <SectionHeader title="Group Rules" />
        <Card style={styles.card}>
          {group.rules.map((rule, index) => (
            <View key={index} style={styles.ruleItem}>
              <Text style={styles.ruleNumber}>{index + 1}.</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </Card>

        {/* Contract Address */}
        <SectionHeader title="Smart Contract" />
        <Card style={styles.card}>
          <View style={styles.contractInfo}>
            <Text style={styles.contractLabel}>Contract Address</Text>
            <Text style={styles.contractAddress}>{group.contractAddress}</Text>
            <TouchableOpacity onPress={handleCopyAddress} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={16} color="#6366F1" />
              <Text style={styles.copyButtonText}>Copy Address</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
            <Text style={styles.primaryButtonText}>Make Contribution</Text>
          </TouchableOpacity>
          {group.isCreator && (
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Manage Group</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    marginBottom: 32,
  },
  groupName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 24,
  },
  groupStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    marginBottom: 24,
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutRound: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  payoutRecipient: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 2,
  },
  payoutDate: {
    fontSize: 12,
    color: '#64748B',
  },
  payoutAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcoming: {
    backgroundColor: '#10B981',
  },
  completed: {
    backgroundColor: '#6366F1',
  },
  pending: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  contributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contributionInfo: {
    flex: 1,
  },
  contributor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  contributionDate: {
    fontSize: 12,
    color: '#64748B',
  },
  contributionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  ruleItem: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  ruleNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginRight: 12,
    minWidth: 20,
  },
  ruleText: {
    fontSize: 14,
    color: '#E2E8F0',
    flex: 1,
    lineHeight: 20,
  },
  contractInfo: {
    paddingVertical: 8,
  },
  contractLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  contractAddress: {
    fontSize: 14,
    color: '#E2E8F0',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtons: {
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
  },
  secondaryButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
