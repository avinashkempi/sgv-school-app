import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Card from '../../components/Card';

describe('Card Component', () => {
  it('renders children correctly', async () => {
    const { getByText } = await render(
      <Card>
        <Text>Student Fee Summary</Text>
      </Card>
    );

    expect(getByText('Student Fee Summary')).toBeTruthy();
  });

  it('renders as non-clickable view when onPress is omitted', async () => {
    const { queryByRole } = await render(
      <Card>
        <Text>Static Card Content</Text>
      </Card>
    );

    expect(queryByRole('button')).toBeNull();
  });

  it('renders with button accessibility role and fires onPress when clicked', async () => {
    const handlePress = jest.fn();
    const { getByRole, getByText } = await render(
      <Card onPress={handlePress} accessibilityLabel="Open Details">
        <Text>Interactive Card</Text>
      </Card>
    );

    const button = getByRole('button');
    expect(button).toBeTruthy();

    fireEvent.press(getByText('Interactive Card'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });
});

