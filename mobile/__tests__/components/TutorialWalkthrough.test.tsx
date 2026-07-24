jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TutorialWalkthrough from '@/components/onboarding/TutorialWalkthrough';
import { ThemeProvider } from '@/context/ThemeContext';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('TutorialWalkthrough', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders nothing when visible is false', () => {
    const onClose = jest.fn();
    const { queryByText } = render(
      <TutorialWalkthrough visible={false} onClose={onClose} />,
      { wrapper: Wrapper }
    );
    expect(queryByText('Welcome to EsuStellar!')).toBeNull();
  });

  it('renders welcome screen when visible is true', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <TutorialWalkthrough visible={true} onClose={onClose} />,
      { wrapper: Wrapper }
    );
    expect(getByText('Welcome to EsuStellar!')).toBeTruthy();
    expect(getByText('Step 1 of 5')).toBeTruthy();
  });

  it('advances through steps when Next is pressed', () => {
    const onClose = jest.fn();
    const { getByText, getByTestId } = render(
      <TutorialWalkthrough visible={true} onClose={onClose} />,
      { wrapper: Wrapper }
    );

    expect(getByText('Welcome to EsuStellar!')).toBeTruthy();

    // Tap Next to step 2
    fireEvent.press(getByTestId('tutorial-next'));
    expect(getByText('Switch Wallets')).toBeTruthy();
    expect(getByText('Step 2 of 5')).toBeTruthy();

    // Tap Next to step 3
    fireEvent.press(getByTestId('tutorial-next'));
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Step 3 of 5')).toBeTruthy();
  });

  it('goes back to previous step when Back is pressed', () => {
    const onClose = jest.fn();
    const { getByText, getByTestId, queryByTestId } = render(
      <TutorialWalkthrough visible={true} onClose={onClose} />,
      { wrapper: Wrapper }
    );

    // No back button on step 1
    expect(queryByTestId('tutorial-back')).toBeNull();

    // Tap Next to step 2
    fireEvent.press(getByTestId('tutorial-next'));
    expect(getByText('Switch Wallets')).toBeTruthy();
    expect(getByTestId('tutorial-back')).toBeTruthy();

    // Tap Back
    fireEvent.press(getByTestId('tutorial-back'));
    expect(getByText('Welcome to EsuStellar!')).toBeTruthy();
  });

  it('calls onClose and saves to AsyncStorage when Finish is pressed on the last step', async () => {
    const onClose = jest.fn();
    const { getByText, getByTestId } = render(
      <TutorialWalkthrough visible={true} onClose={onClose} />,
      { wrapper: Wrapper }
    );

    // Advance to last step (5)
    fireEvent.press(getByTestId('tutorial-next')); // 2
    fireEvent.press(getByTestId('tutorial-next')); // 3
    fireEvent.press(getByTestId('tutorial-next')); // 4
    fireEvent.press(getByTestId('tutorial-next')); // 5

    expect(getByText('Finish')).toBeTruthy();

    // Tap Finish
    fireEvent.press(getByTestId('tutorial-next'));

    expect(onClose).toHaveBeenCalledTimes(1);
    const completeVal = await AsyncStorage.getItem('tutorialComplete');
    expect(completeVal).toBe('true');
  });

  it('calls onClose and saves to AsyncStorage when Skip is pressed', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <TutorialWalkthrough visible={true} onClose={onClose} />,
      { wrapper: Wrapper }
    );

    fireEvent.press(getByTestId('tutorial-skip'));

    expect(onClose).toHaveBeenCalledTimes(1);
    const completeVal = await AsyncStorage.getItem('tutorialComplete');
    expect(completeVal).toBe('true');
  });
});
