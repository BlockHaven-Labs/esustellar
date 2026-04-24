'use client';

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TextInput } from '../../components/ui/TextInput';
import Button from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Card } from '../../components/ui/Card';

interface FormData {
  groupName: string;
  description: string;
  contributionAmount: string;
  payoutFrequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly';
  maxMembers: string;
  rules: string[];
}

interface FormErrors {
  groupName?: string;
  description?: string;
  contributionAmount?: string;
  maxMembers?: string;
  rules?: string;
}

const PAYOUT_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const DEFAULT_RULES = [
  'Each member must contribute on time',
  'Payouts rotate equally among all members',
  'Members must be active contributors to receive payouts',
  'Group decisions require majority vote'
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState<FormData>({
    groupName: '',
    description: '',
    contributionAmount: '',
    payoutFrequency: 'monthly',
    maxMembers: '',
    rules: DEFAULT_RULES,
  });

  const validateStep1 = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.groupName.trim()) {
      newErrors.groupName = 'Group name is required';
    } else if (formData.groupName.length < 3) {
      newErrors.groupName = 'Group name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.contributionAmount.trim()) {
      newErrors.contributionAmount = 'Contribution amount is required';
    } else if (isNaN(Number(formData.contributionAmount)) || Number(formData.contributionAmount) <= 0) {
      newErrors.contributionAmount = 'Please enter a valid amount';
    } else if (Number(formData.contributionAmount) < 10) {
      newErrors.contributionAmount = 'Minimum contribution is $10';
    }

    if (!formData.maxMembers.trim()) {
      newErrors.maxMembers = 'Maximum members is required';
    } else if (isNaN(Number(formData.maxMembers)) || Number(formData.maxMembers) < 2) {
      newErrors.maxMembers = 'Minimum 2 members required';
    } else if (Number(formData.maxMembers) > 50) {
      newErrors.maxMembers = 'Maximum 50 members allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: FormErrors = {};
    
    if (formData.rules.length === 0) {
      newErrors.rules = 'At least one rule is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;
    
    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    } else if (currentStep === 3) {
      isValid = validateStep3();
    }

    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setLoading(true);
    
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Success!',
        'Your savings group has been created successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/groups')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addRule = () => {
    setFormData(prev => ({
      ...prev,
      rules: [...prev.rules, '']
    }));
  };

  const updateRule = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.map((rule, i) => i === index ? value : rule)
    }));
  };

  const removeRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.progressStep}>
            <View style={[
              styles.progressCircle,
              step <= currentStep && styles.activeCircle
            ]}>
              <Text style={[
                styles.progressText,
                step <= currentStep && styles.activeText
              ]}>
                {step}
              </Text>
            </View>
            {step < 4 && (
              <View style={[
                styles.progressLine,
                step < currentStep && styles.activeLine
              ]} />
            )}
          </View>
        ))}
      </View>
      <Text style={styles.progressTitle}>
        {currentStep === 1 && 'Basic Information'}
        {currentStep === 2 && 'Contribution Settings'}
        {currentStep === 3 && 'Group Rules'}
        {currentStep === 4 && 'Review & Create'}
      </Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <TextInput
        label="Group Name"
        value={formData.groupName}
        onChangeText={(value) => updateFormData('groupName', value)}
        placeholder="Enter group name"
        error={errors.groupName}
        maxLength={50}
      />
      
      <TextInput
        label="Description"
        value={formData.description}
        onChangeText={(value) => updateFormData('description', value)}
        placeholder="Describe the purpose of your savings group"
        error={errors.description}
        multiline
        numberOfLines={4}
        maxLength={200}
        style={styles.textArea}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <TextInput
        label="Contribution Amount ($)"
        value={formData.contributionAmount}
        onChangeText={(value) => updateFormData('contributionAmount', value)}
        placeholder="100"
        error={errors.contributionAmount}
        keyboardType="numeric"
      />

      <View style={styles.frequencyContainer}>
        <Text style={styles.label}>Payout Frequency</Text>
        <View style={styles.frequencyOptions}>
          {PAYOUT_FREQUENCIES.map((freq) => (
            <TouchableOpacity
              key={freq.value}
              style={[
                styles.frequencyOption,
                formData.payoutFrequency === freq.value && styles.selectedFrequency
              ]}
              onPress={() => updateFormData('payoutFrequency', freq.value)}
            >
              <Text style={[
                styles.frequencyText,
                formData.payoutFrequency === freq.value && styles.selectedFrequencyText
              ]}>
                {freq.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TextInput
        label="Maximum Members"
        value={formData.maxMembers}
        onChangeText={(value) => updateFormData('maxMembers', value)}
        placeholder="10"
        error={errors.maxMembers}
        keyboardType="numeric"
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.rulesHeader}>
        <Text style={styles.label}>Group Rules</Text>
        <TouchableOpacity onPress={addRule} style={styles.addRuleButton}>
          <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
          <Text style={styles.addRuleText}>Add Rule</Text>
        </TouchableOpacity>
      </View>
      
      {formData.rules.map((rule, index) => (
        <View key={index} style={styles.ruleItem}>
          <TextInput
            value={rule}
            onChangeText={(value) => updateRule(index, value)}
            placeholder={`Rule ${index + 1}`}
            multiline
            numberOfLines={2}
            style={styles.ruleInput}
          />
          {formData.rules.length > 1 && (
            <TouchableOpacity
              onPress={() => removeRule(index)}
              style={styles.removeRuleButton}
            >
              <Ionicons name="remove-circle-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      
      {errors.rules && (
        <Text style={styles.errorText}>{errors.rules}</Text>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.reviewTitle}>Review Your Group</Text>
      
      <Card style={styles.reviewCard}>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Group Name</Text>
          <Text style={styles.reviewValue}>{formData.groupName}</Text>
        </View>
        
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Description</Text>
          <Text style={styles.reviewValue}>{formData.description}</Text>
        </View>
        
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Contribution Amount</Text>
          <Text style={styles.reviewValue}>${formData.contributionAmount}</Text>
        </View>
        
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Payout Frequency</Text>
          <Text style={styles.reviewValue}>
            {PAYOUT_FREQUENCIES.find(f => f.value === formData.payoutFrequency)?.label}
          </Text>
        </View>
        
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Maximum Members</Text>
          <Text style={styles.reviewValue}>{formData.maxMembers}</Text>
        </View>
        
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Rules</Text>
          <View style={styles.rulesList}>
            {formData.rules.map((rule, index) => (
              rule.trim() && (
                <Text key={index} style={styles.ruleText}>
                  • {rule}
                </Text>
              )
            ))}
          </View>
        </View>
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderProgressBar()}
        
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <Button
              variant="outline"
              onPress={handlePrevious}
              style={styles.previousButton}
            >
              Previous
            </Button>
          )}
          
          <Button
            onPress={currentStep === 4 ? handleSubmit : handleNext}
            loading={loading}
            style={styles.nextButton}
          >
            {currentStep === 4 ? 'Create Group' : 'Next'}
          </Button>
        </View>
      </View>
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
  progressContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCircle: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeText: {
    color: '#fff',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#1E293B',
    marginHorizontal: 8,
  },
  activeLine: {
    backgroundColor: '#6366F1',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  stepContainer: {
    paddingBottom: 32,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  frequencyContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedFrequency: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  frequencyText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFrequencyText: {
    color: '#fff',
  },
  rulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addRuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addRuleText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  ruleInput: {
    flex: 1,
  },
  removeRuleButton: {
    marginTop: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 8,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  reviewCard: {
    padding: 20,
  },
  reviewItem: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  reviewValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  rulesList: {
    marginTop: 8,
  },
  ruleText: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  previousButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
