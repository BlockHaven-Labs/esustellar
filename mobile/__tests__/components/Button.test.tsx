import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders label text', () => {
    const { getByText } = render(<Button>Submit</Button>);
    expect(getByText('Submit')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress}>Click me</Button>);
    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress} disabled>Disabled</Button>);
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders primary variant without error', () => {
    const { getByText } = render(<Button variant="primary">Primary</Button>);
    expect(getByText('Primary')).toBeTruthy();
  });

  it('renders secondary variant without error', () => {
    const { getByText } = render(<Button variant="secondary">Secondary</Button>);
    expect(getByText('Secondary')).toBeTruthy();
  });

  it('renders outline variant without error', () => {
    const { getByText } = render(<Button variant="outline">Outline</Button>);
    expect(getByText('Outline')).toBeTruthy();
  });
});
