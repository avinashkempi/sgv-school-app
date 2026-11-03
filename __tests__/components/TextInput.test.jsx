import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TextInput from '../../components/TextInput';

describe('TextInput Component', () => {
  it('renders label and placeholder text correctly', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <TextInput label="Student Phone Number" placeholder="Enter 10-digit number" />
    );

    expect(getByText('Student Phone Number')).toBeTruthy();
    expect(getByPlaceholderText('Enter 10-digit number')).toBeTruthy();
  });

  it('invokes onChangeText callback when user types', async () => {
    const handleChange = jest.fn();
    const { getByPlaceholderText } = await render(
      <TextInput
        placeholder="Enter Name"
        value=""
        onChangeText={handleChange}
      />
    );

    const input = getByPlaceholderText('Enter Name');
    fireEvent.changeText(input, 'Aditya Joshi');

    expect(handleChange).toHaveBeenCalledWith('Aditya Joshi');
  });

  it('renders error message in error tone when error prop is provided', async () => {
    const { getByText } = await render(
      <TextInput
        label="Password"
        placeholder="Enter Password"
        error="Password must be at least 6 characters"
      />
    );

    expect(getByText('Password must be at least 6 characters')).toBeTruthy();
  });

  it('renders assistive helper text when helperText prop is passed', async () => {
    const { getByText } = await render(
      <TextInput
        label="Admission ID"
        placeholder="e.g. ADM202601"
        helperText="Found on your enrollment receipt"
      />
    );

    expect(getByText('Found on your enrollment receipt')).toBeTruthy();
  });

  it('triggers onRightIconPress when right action icon is tapped', async () => {
    const handleRightPress = jest.fn();
    const { getByLabelText } = await render(
      <TextInput
        label="Password"
        placeholder="Password"
        rightIcon="visibility"
        rightIconAccessibilityLabel="Toggle password visibility"
        onRightIconPress={handleRightPress}
      />
    );

    const iconButton = getByLabelText('Toggle password visibility');
    fireEvent.press(iconButton);

    expect(handleRightPress).toHaveBeenCalledTimes(1);
  });
});

