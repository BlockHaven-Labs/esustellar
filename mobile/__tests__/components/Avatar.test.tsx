import React from 'react';
import { render } from '@testing-library/react-native';
import { Avatar } from '@/components/ui/Avatar';

describe('Avatar', () => {
  it('shows initials when no uri is provided', () => {
    const { getByText } = render(<Avatar name="John Doe" />);
    expect(getByText('JD')).toBeTruthy();
  });

  it('shows single initial for single-word names', () => {
    const { getByText } = render(<Avatar name="Alice" />);
    expect(getByText('A')).toBeTruthy();
  });

  it('renders an image when uri is provided', () => {
    const { getByRole } = render(
      <Avatar name="John Doe" uri="https://example.com/avatar.png" />,
    );
    expect(getByRole('image')).toBeTruthy();
  });

  it('renders without error for different sizes', () => {
    const { rerender, getByText } = render(<Avatar name="AB" size="sm" />);
    expect(getByText('AB')).toBeTruthy();
    rerender(<Avatar name="AB" size="lg" />);
    expect(getByText('AB')).toBeTruthy();
  });
});
