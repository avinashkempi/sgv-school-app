import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Login from '../../app/login';
import { useRouter } from 'expo-router';

// Mock AuthContext
const mockLogin = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    token: null,
    isAuthenticated: false,
  }),
}));

// Mock Toast
const mockShowToast = jest.fn();
jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock Labels
jest.mock('../../context/LabelsContext', () => ({
  useLabel: () => ({
    t: (key, fallback) => fallback || key,
  }),
}));

// Mock useApiMutation
const mockMutate = jest.fn();
let mockIsPending = false;
jest.mock('../../hooks/useApi', () => ({
  useApiMutation: (options) => {
    return {
      mutate: (variables) => {
        mockMutate(variables);
        if (options?.onSuccess) {
          if (variables.phone === '9876543210' && variables.password === 'correctPassword') {
            options.onSuccess({
              token: 'jwt-auth-token-xyz',
              user: { id: 'usr-1', name: 'Valid User', role: 'student' },
            });
          } else if (variables.phone === '9876543210' && variables.password === 'wrongPassword') {
            options.onSuccess({
              token: null,
              message: 'Invalid credentials',
            });
          }
        }
        if (options?.onError && variables.phone === '0000000000') {
          options.onError(new Error('Network request failed'));
        }
      },
      isPending: mockIsPending,
    };
  },
  createApiMutationFn: jest.fn(),
}));

describe('Login Screen (app/login.jsx)', () => {
  const router = useRouter();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  it('renders login screen elements properly', async () => {
    const { getByText, getByPlaceholderText } = await render(<Login />);

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Shri Guru Vidya English Medium School')).toBeTruthy();
    expect(getByPlaceholderText('Enter 10-digit mobile number')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Explore Demo as Guest')).toBeTruthy();
  });

  it('displays validation errors when submitting empty form', async () => {
    const { getByRole, getByText, queryByText } = await render(<Login />);

    expect(queryByText('Phone number is required')).toBeNull();
    expect(queryByText('Password is required')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(getByText('Phone number is required')).toBeTruthy();
      expect(getByText('Password is required')).toBeTruthy();
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('displays validation error when phone number has fewer than 10 digits', async () => {
    const { getByRole, getByText, getByPlaceholderText, getByDisplayValue } = await render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Enter 10-digit mobile number'), '98765');
    await waitFor(() => {
      expect(getByDisplayValue('98765')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'mypassword');
    await waitFor(() => {
      expect(getByDisplayValue('mypassword')).toBeTruthy();
    });

    fireEvent.press(getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(getByText('Enter a valid 10-digit number')).toBeTruthy();
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('submits credentials and routes to home on successful authentication', async () => {
    const { getByRole, getByPlaceholderText, getByDisplayValue } = await render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Enter 10-digit mobile number'), '9876543210');
    await waitFor(() => {
      expect(getByDisplayValue('9876543210')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'correctPassword');
    await waitFor(() => {
      expect(getByDisplayValue('correctPassword')).toBeTruthy();
    });

    fireEvent.press(getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        phone: '9876543210',
        password: 'correctPassword',
      });
      expect(mockLogin).toHaveBeenCalledWith('jwt-auth-token-xyz', {
        id: 'usr-1',
        name: 'Valid User',
        role: 'student',
      });
      expect(router.replace).toHaveBeenCalledWith('/');
      expect(mockShowToast).toHaveBeenCalledWith('Logged in successfully', 'success', 2000);
    });
  });

  it('shows error toast when server returns unsuccessful response', async () => {
    const { getByRole, getByPlaceholderText, getByDisplayValue } = await render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Enter 10-digit mobile number'), '9876543210');
    await waitFor(() => {
      expect(getByDisplayValue('9876543210')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongPassword');
    await waitFor(() => {
      expect(getByDisplayValue('wrongPassword')).toBeTruthy();
    });

    fireEvent.press(getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Invalid credentials', 'error');
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('handles network failure error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { getByRole, getByPlaceholderText, getByDisplayValue } = await render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Enter 10-digit mobile number'), '0000000000');
    await waitFor(() => {
      expect(getByDisplayValue('0000000000')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'anyPassword');
    await waitFor(() => {
      expect(getByDisplayValue('anyPassword')).toBeTruthy();
    });

    fireEvent.press(getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Network request failed', 'error');
    });

    consoleErrorSpy.mockRestore();
  });

  it('opens demo modal and logs in as guest student', async () => {
    const { getByRole, getByText, getByLabelText } = await render(<Login />);

    fireEvent.press(getByRole('button', { name: 'Explore Demo as Guest' }));

    await waitFor(() => {
      expect(getByText('Choose Demo Persona')).toBeTruthy();
      expect(getByText('Student')).toBeTruthy();
    });

    fireEvent.press(getByLabelText(/Explore as Student/));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'demo-token',
        expect.objectContaining({ role: 'student' })
      );
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });
});
