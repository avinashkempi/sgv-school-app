import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../components/Button';

describe('Button Component', () => {
  it('renders button title correctly', async () => {
    const { getByText } = await render(<Button title="Submit Assignment" />);
    expect(getByText('Submit Assignment')).toBeTruthy();
  });

  it('triggers onPress callback when clicked', async () => {
    const handlePress = jest.fn();
    const { getByText } = await render(
      <Button title="Click Me" onPress={handlePress} />
    );

    fireEvent.press(getByText('Click Me'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onPress when disabled', async () => {
    const handlePress = jest.fn();
    const { getByRole } = await render(
      <Button title="Disabled Action" disabled onPress={handlePress} />
    );

    const button = getByRole('button');
    fireEvent.press(button);
    expect(handlePress).not.toHaveBeenCalled();
  });

  it('shows loading indicator and suppresses onPress when loading', async () => {
    const handlePress = jest.fn();
    const { getByRole } = await render(
      <Button title="Saving..." loading onPress={handlePress} />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityState.busy).toBe(true);

    fireEvent.press(button);
    expect(handlePress).not.toHaveBeenCalled();
  });
});
