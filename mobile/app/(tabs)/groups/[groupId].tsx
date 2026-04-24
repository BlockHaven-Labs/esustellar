'use client';

import React from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '../../../components/ui/Badge';

type Group = {
  id: string;
  name: string;
  status: 'Active' | 'Paused' | 'Closed' | 'Pending';
  contribution: string;
  frequency: string;
  memberCount: number;
};

const MOCK_GROUPS: Group[] = [
  {
    id: '1',
    name: 'Solar Saver Collective',
    status: 'Active',
    contribution: '45 XLM',
    frequency: 'Monthly',
    memberCount: 8,
  },
  {
    id: '2',
    name: 'Lunar Growth Syndicate',
    status: 'Paused',
    contribution: '90 XLM',
    frequency: 'Biweekly',
    memberCount: 12,
  },
  {
    id: '3',
    name: 'Horizon Funding Group',
    status: 'Pending',
    contribution: '120 XLM',
    frequency: 'Weekly',
    memberCount: 5,
  },
];

const STATUS_VARIANT_MAP: Record<Group['status'], 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  Active: 'success',
  Paused: 'warning',
  Closed: 'error',
  Pending: 'info',
};

function GroupDetailHeader({ group }: { group: Group }) {
  return (
    <View style={styles.groupHeader}>
      <View style={styles.titleRow}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Badge label={group.status} variant={STATUS_VARIANT_MAP[group.status]} />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.contributionAmount}>{group.contribution}</Text>
        <Text style={styles.frequencyText}>{group.frequency}</Text>
      </View>

      <Text style={styles.memberText}>{group.memberCount} members</Text>
    </View>
  );
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groupId = params.groupId ?? '';
  const group = MOCK_GROUPS.find((item) => item.id === groupId) || null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Group Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {group ? (
          <>
            <GroupDetailHeader group={group} />

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Overview</Text>
              <Text style={styles.sectionText}>
                This is the group detail screen for “{group.name}”. The group has a contribution amount of {group.contribution} paid {group.frequency.toLowerCase()}, and currently includes {group.memberCount} members.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Group ID</Text>
              <Text style={styles.sectionText}>{groupId}</Text>
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Group not found</Text>
            <Text style={styles.sectionText}>
              No mock group was found for the requested ID. Use a valid group link to see details.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  backButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  screenTitle: {
    marginLeft: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    padding: 16,
  },
  groupHeader: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 12,
  },
  amountRow: {
    marginBottom: 8,
  },
  contributionAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  frequencyText: {
    marginTop: 6,
    fontSize: 16,
    color: '#475569',
  },
  memberText: {
    fontSize: 15,
    color: '#475569',
    opacity: 0.9,
  },
  section: {
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  sectionHeading: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
  },
});
