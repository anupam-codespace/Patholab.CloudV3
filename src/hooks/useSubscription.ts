import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export function useSubscription() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await fetch('/api/subscriptions');
      if (!response.ok) throw new Error('Failed to fetch subscription');
      return response.json();
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Plan upgraded successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Subscription cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    subscription: data?.subscription,
    isLoading,
    upgradePlan: upgradeMutation.mutate,
    cancelSubscription: cancelMutation.mutate,
    isUpgrading: upgradeMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}
