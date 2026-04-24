'use client';

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TextInput } from '../../components/ui/TextInput';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { groupsApi } from '../../services/api/groupsApi';

interface GroupInfo {
  groupId: string;
  groupName: string;
  memberCount: number;
  maxMembers: number;
  contributionAmount: number;
  payoutFrequency: string;
  description?: string;
  creatorAddress: string;
}

interface JoinFormData {
  inviteCode: string;
  qrCodeData: string;
}

export default function JoinGroupScreen() {
  const router = useRouter();
  const [joinMethod, setJoinMethod] = useState<'invite' | 'qr'>('invite');
  const [formData, setFormData] = useState<JoinFormData>({
    inviteCode: '',
    qrCodeData: '',
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [error, setError] = useState<string>('');

  const handleInviteCodeChange = (value: string) => {
    setFormData(prev => ({ ...prev, inviteCode: value.toUpperCase() }));
    setError('');
    if (groupInfo) {
      setGroupInfo(null);
    }
  };

  const validateInviteCode = async () => {
    if (!formData.inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await groupsApi.validateInviteCode(formData.inviteCode);
      
      if (response.success && response.data) {
        setGroupInfo({
          groupId: response.data.groupId,
          groupName: response.data.groupName,
          memberCount: response.data.memberCount,
          maxMembers: response.data.maxMembers,
          contributionAmount: 100, // Mock data
          payoutFrequency: 'monthly', // Mock data
          description: 'A great savings group',
          creatorAddress: '0x1234...5678',
        });
      } else {
        setError(response.error || 'Invalid invite code');
      }
    } catch (error) {
      setError('Failed to validate invite code');
    } finally {
      setValidating(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!groupInfo) {
      setError('Please validate the invite code first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Mock user address - replace with actual wallet address
      const userAddress = '0xuser...address';
      
      const response = await groupsApi.joinGroupWithCode(formData.inviteCode, userAddress);
      
      if (response.success) {
        Alert.alert(
          'Success!',
          `You have successfully joined "${groupInfo.groupName}"`,
          [
            {
              text: 'View Group',
              onPress: () => router.push(`/groups/${groupInfo.groupId}`)
            },
            {
              text: 'Go to Groups',
              onPress: () => router.push('/groups')
            }
          ]
        );
      } else {
        setError(response.error || 'Failed to join group');
      }
    } catch (error) {
      setError('Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleQRCodeScan = () => {
    // Mock QR code scanning - replace with actual QR scanner implementation
    Alert.alert(
      'QR Code Scanner',
      'QR code scanning would be implemented here using a library like react-native-camera or expo-camera',
      [
        {
          text: 'Mock Scan',
          onPress: () => {
            const mockQRData = 'INVITE_ABC12345';
            setFormData(prev => ({ ...prev, qrCodeData: mockQRData, inviteCode: mockQRData }));
            setJoinMethod('invite');
            setTimeout(validateInviteCode, 500);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const renderJoinMethodSelector = () => (
    <View style={styles.methodSelector}>
      <TouchableOpacity
        style={[
          styles.methodOption,
          joinMethod === 'invite' && styles.selectedMethod
        ]}
        onPress={() => setJoinMethod('invite')}
      >
        <Ionicons 
          name="key-outline" 
          size={24} 
          color={joinMethod === 'invite' ? '#6366F1' : '#64748B'} 
        />
        <Text style={[
          styles.methodText,
          joinMethod === 'invite' && styles.selectedMethodText
        ]}>
          Invite Code
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodOption,
          joinMethod === 'qr' && styles.selectedMethod
        ]}
        onPress={() => setJoinMethod('qr')}
      >
        <Ionicons 
          name="qr-code-outline" 
          size={24} 
          color={joinMethod === 'qr' ? '#6366F1' : '#64748B'} 
        />
        <Text style={[
          styles.methodText,
          joinMethod === 'qr' && styles.selectedMethodText
        ]}>
          QR Code
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderInviteCodeForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Enter Invite Code</Text>
      <Text style={styles.formDescription}>
        Ask the group creator for the invite code to join their savings group
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          label="Invite Code"
          value={formData.inviteCode}
          onChangeText={handleInviteCodeChange}
          placeholder="ENTER123"
          error={error}
          autoCapitalize="characters"
          maxLength={12}
          style={styles.inviteInput}
        />
        
        <TouchableOpacity
          onPress={validateInviteCode}
          disabled={!formData.inviteCode.trim() || validating}
          style={[
            styles.validateButton,
            (!formData.inviteCode.trim() || validating) && styles.disabledButton
          ]}
        >
          {validating ? (
            <Text style={styles.validateButtonText}>Validating...</Text>
          ) : (
            <Text style={styles.validateButtonText}>Validate</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );

  const renderQRCodeForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Scan QR Code</Text>
      <Text style={styles.formDescription}>
        Point your camera at the QR code to instantly join the group
      </Text>

      <TouchableOpacity onPress={handleQRCodeScan} style={styles.qrScanner}>
        <View style={styles.qrPlaceholder}>
          <Ionicons name="qr-code-outline" size={64} color="#64748B" />
          <Text style={styles.qrPlaceholderText}>Tap to scan QR code</Text>
        </View>
      </TouchableOpacity>

      {formData.qrCodeData && (
        <View style={styles.qrResult}>
          <Text style={styles.qrResultLabel}>Scanned Data:</Text>
          <Text style={styles.qrResultText}>{formData.qrCodeData}</Text>
        </View>
      )}
    </View>
  );

  const renderGroupPreview = () => {
    if (!groupInfo) return null;

    return (
      <Card style={styles.groupPreview}>
        <Text style={styles.previewTitle}>Group Details</Text>
        
        <View style={styles.previewItem}>
          <Text style={styles.previewLabel}>Group Name</Text>
          <Text style={styles.previewValue}>{groupInfo.groupName}</Text>
        </View>

        <View style={styles.previewItem}>
          <Text style={styles.previewLabel}>Members</Text>
          <Text style={styles.previewValue}>
            {groupInfo.memberCount}/{groupInfo.maxMembers}
          </Text>
        </View>

        <View style={styles.previewItem}>
          <Text style={styles.previewLabel}>Contribution</Text>
          <Text style={styles.previewValue}>${groupInfo.contributionAmount}/month</Text>
        </View>

        {groupInfo.description && (
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Description</Text>
            <Text style={styles.previewDescription}>{groupInfo.description}</Text>
          </View>
        )}

        <View style={styles.spotsAvailable}>
          <Ionicons name="people-outline" size={16} color="#10B981" />
          <Text style={styles.spotsText}>
            {groupInfo.maxMembers - groupInfo.memberCount} spots available
          </Text>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Group</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderJoinMethodSelector()}

        {joinMethod === 'invite' ? renderInviteCodeForm() : renderQRCodeForm()}

        {renderGroupPreview()}

        {groupInfo && (
          <View style={styles.actionContainer}>
            <Button
              onPress={handleJoinGroup}
              loading={loading}
              style={styles.joinButton}
            >
              Join Group
            </Button>
          </View>
        )}

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <TouchableOpacity style={styles.helpItem}>
            <Ionicons name="help-circle-outline" size={16} color="#6366F1" />
            <Text style={styles.helpText}>How to get an invite code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpItem}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#6366F1" />
            <Text style={styles.helpText}>Is this group safe?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpItem}>
            <Ionicons name="mail-outline" size={16} color="#6366F1" />
            <Text style={styles.helpText}>Contact support</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginVertical: 24,
  },
  methodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectedMethod: {
    backgroundColor: '#6366F1',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  selectedMethodText: {
    color: '#fff',
  },
  formContainer: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    position: 'relative',
  },
  inviteInput: {
    paddingRight: 100,
  },
  validateButton: {
    position: 'absolute',
    right: 8,
    top: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6366F1',
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#334155',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
  qrScanner: {
    aspectRatio: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  qrPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  qrPlaceholderText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  qrResult: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  qrResultLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  qrResultText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
  groupPreview: {
    marginBottom: 24,
    padding: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  previewItem: {
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  previewValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  previewDescription: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  spotsAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#10B98120',
    borderRadius: 8,
  },
  spotsText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    marginBottom: 24,
  },
  joinButton: {
    paddingVertical: 16,
  },
  helpSection: {
    marginBottom: 32,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  helpText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
});
