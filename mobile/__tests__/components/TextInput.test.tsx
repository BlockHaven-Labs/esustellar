import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextInput } from '@/components/ui/TextInput';

describe('TextInput', () => {
  it('renders the label', () => {
    const { getByText } = render(<TextInput label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('renders placeholder text', () => {
    const { getByPlaceholderText } = render(
      <TextInput placeholder="Enter email" />,
    );
    expect(getByPlaceholderText('Enter email')).toBeTruthy();
  });

  it('shows error message when error prop is provided', () => {
    const { getByText } = render(<TextInput error="Required field" />);
    expect(getByText('Required field')).toBeTruthy();
  });

  it('does not show error message when error prop is absent', () => {
    const { queryByText } = render(<TextInput label="Name" />);
    expect(queryByText('Required field')).toBeNull();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <TextInput placeholder="Type here" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByPlaceholderText('Type here'), 'hello');
    expect(onChangeText).toHaveBeenCalledWith('hello');
  });
});
