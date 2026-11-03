import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import RoleGuard from '../../components/RoleGuard';
import * as AuthContextModule from '../../context/AuthContext';
import * as ToastModule from '../../components/ToastProvider';
import { useRouter } from 'expo-router';

jest.mock('../../context/AuthContext');
jest.mock('../../components/ToastProvider');

describe('RoleGuard Component', () => {
  let mockRouter;
  let mockShowToast;

  beforeEach(() => {
    mockRouter = useRouter();
    jest.clearAllMocks();
    mockShowToast = jest.fn();
    jest.spyOn(ToastModule, 'useToast').mockReturnValue({ showToast: mockShowToast });
  });

  it('renders loading state (hides protected children) when auth is not ready', async () => {
    jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isReady: false,
      isAuthenticated: false,
      user: null,
      isDemo: false
    });

    const { queryByText } = await render(
      <RoleGuard allowedRoles={['admin']}>
        <Text>Admin Protected Content</Text>
      </RoleGuard>
    );

    // Protected content should NOT be rendered while authenticating
    expect(queryByText('Admin Protected Content')).toBeNull();
  });

  it('renders children when authenticated and user has an allowed role', async () => {
    jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isReady: true,
      isAuthenticated: true,
      user: { role: 'admin', name: 'Admin User' },
      isDemo: false
    });

    const { getByText } = await render(
      <RoleGuard allowedRoles={['admin', 'super admin']}>
        <Text>Admin Protected Content</Text>
      </RoleGuard>
    );

    expect(getByText('Admin Protected Content')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('redirects to /login when user is not authenticated', async () => {
    jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isReady: true,
      isAuthenticated: false,
      user: null,
      isDemo: false
    });

    const { queryByText } = await render(
      <RoleGuard allowedRoles={['admin']}>
        <Text>Admin Protected Content</Text>
      </RoleGuard>
    );

    expect(queryByText('Admin Protected Content')).toBeNull();
    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
  });

  it('redirects to / and shows toast when user role is not permitted', async () => {
    jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isReady: true,
      isAuthenticated: true,
      user: { role: 'student', name: 'Student User' },
      isDemo: false
    });

    const { queryByText } = await render(
      <RoleGuard allowedRoles={['admin', 'teacher']}>
        <Text>Staff Only Section</Text>
      </RoleGuard>
    );

    expect(queryByText('Staff Only Section')).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      'You do not have access to this section',
      'error',
      2500
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});
