import { useQuery } from '@tanstack/react-query';

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // The API returns { user, lab, permissions }
  // We merge lab + permissions onto the user object for convenience
  const rawUser = data?.user;
  const lab = data?.lab;
  const permissions = data?.permissions || [];

  const user = rawUser
    ? {
        ...rawUser,
        lab: lab || null,
        permissions,
        // Convenience aliases used across headers and layout
        currentBranch: lab
          ? { id: lab.branchId, name: lab.branchName }
          : null,
        currencySymbol: lab?.currencySymbol || '₹',
        walletBalance: lab?.wallet?.balance ?? 0,
      }
    : undefined;

  return {
    user,
    isLoading,
    isAuthenticated: !!rawUser,
    error,
  };
}

