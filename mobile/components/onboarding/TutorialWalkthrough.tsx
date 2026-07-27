import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import PaginationDots from './PaginationDots';

const { width, height } = Dimensions.get('window');

interface TutorialStep {
  title: string;
  description: string;
  targetArea?: {
    top: number | string;
    left: number | string;
    width: number | string;
    height: number | string;
    borderRadius?: number;
  };
  pointerPosition?: 'top' | 'bottom' | 'center';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to EsuStellar!',
    description: 'Let\'s take a quick 1-minute tour of your secure savings circle dashboard.',
    pointerPosition: 'center',
  },
  {
    title: 'Switch Wallets',
    description: 'Tap your wallet address at the top left to instantly switch between your connected accounts.',
    targetArea: {
      top: 60,
      left: 12,
      width: width * 0.7,
      height: 70,
      borderRadius: 12,
    },
    pointerPosition: 'bottom',
  },
  {
    title: 'Notifications',
    description: 'Tap the bell icon at the top right to check your payout notices, due contributions, or member requests.',
    targetArea: {
      top: 60,
      left: width - 60,
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    pointerPosition: 'bottom',
  },
  {
    title: 'Total Balance',
    description: 'Track the cumulative balance of your active savings circle accounts in Stellar Lumens (XLM).',
    targetArea: {
      top: 150,
      left: 16,
      width: width - 32,
      height: 90,
      borderRadius: 12,
    },
    pointerPosition: 'bottom',
  },
  {
    title: 'Quick Actions',
    description: 'Access shortcuts here to make deposits, invite new members, or manage active circles.',
    targetArea: {
      top: 255,
      left: 16,
      width: width - 32,
      height: 80,
      borderRadius: 12,
    },
    pointerPosition: 'top',
  },
];

interface TutorialWalkthroughProps {
  visible: boolean;
  onClose: () => void;
}

export default function TutorialWalkthrough({ visible, onClose }: TutorialWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { colors, resolvedColorScheme } = useTheme();

  const handleNext = async () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('tutorialComplete', 'true');
    } catch (e) {
      console.warn('Failed to save tutorial status', e);
    }
    onClose();
  };

  if (!visible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isDark = resolvedColorScheme === 'dark';

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleComplete}
    >
      <View style={styles.overlay}>
        {/* Spotlight Highlight Box */}
        {step.targetArea && (
          <View
            style={[
              styles.spotlight,
              {
                top: step.targetArea.top as any,
                left: step.targetArea.left as any,
                width: step.targetArea.width as any,
                height: step.targetArea.height as any,
                borderRadius: step.targetArea.borderRadius ?? 8,
                borderColor: colors.accent,
                shadowColor: colors.accent,
              },
            ]}
          />
        )}

        {/* Backdrop for other parts - visually dark transparent */}
        <View style={styles.backdropCover} pointerEvents="none" />

        {/* Tutorial Card */}
        <View
          style={[
            styles.cardContainer,
            step.pointerPosition === 'top' && { top: (step.targetArea ? (step.targetArea.top as number) + (step.targetArea.height as number) + 12 : 250) },
            step.pointerPosition === 'bottom' && { top: (step.targetArea ? (step.targetArea.top as number) - 170 : 150) },
            step.pointerPosition === 'center' && styles.cardCenter,
            { backgroundColor: isDark ? '#111B2E' : '#FFFFFF', borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.stepIndicator, { color: colors.accent }]}>
              Step {currentStep + 1} of {TUTORIAL_STEPS.length}
            </Text>
            <Pressable
              onPress={handleComplete}
              style={styles.skipButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Skip tutorial"
              accessibilityRole="button"
              testID="tutorial-skip"
            >
              <Text style={[styles.skipText, { color: colors.subtext }]}>Skip</Text>
            </Pressable>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>
          <Text style={[styles.description, { color: colors.subtext }]}>{step.description}</Text>

          <View style={styles.footer}>
            <View style={styles.dotsWrapper}>
              <PaginationDots total={TUTORIAL_STEPS.length} current={currentStep} />
            </View>

            <View style={styles.buttonRow}>
              {currentStep > 0 && (
                <Pressable
                  onPress={handleBack}
                  style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]}
                  accessibilityLabel="Previous step"
                  accessibilityRole="button"
                  testID="tutorial-back"
                >
                  <Text style={[styles.btnTextSecondary, { color: colors.text }]}>Back</Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleNext}
                style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.accent }]}
                accessibilityLabel="Next step"
                accessibilityRole="button"
                testID="tutorial-next"
              >
                <Text style={styles.btnTextPrimary}>
                  {currentStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.78)',
    position: 'relative',
  },
  backdropCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  spotlight: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  cardContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardCenter: {
    top: '30%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepIndicator: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skipButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotsWrapper: {
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    minWidth: 70,
  },
  btnSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnTextPrimary: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 14,
  },
  btnTextSecondary: {
    fontWeight: '600',
    fontSize: 14,
  },
});
