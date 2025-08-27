import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface UsageData {
  count: number;
  limit: number;
  date: string;
}

export function useUsageLimit() {
  const [usageCount, setUsageCount] = useState(0);
  const [isUsageLimitExceeded, setIsUsageLimitExceeded] = useState(false);

  const { data, refetch } = useQuery<UsageData>({
    queryKey: ['/api/usage'],
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data) {
      setUsageCount(data.count);
      setIsUsageLimitExceeded(data.count >= data.limit);
    }
  }, [data]);

  return {
    usageCount,
    isUsageLimitExceeded,
    refetchUsage: refetch,
  };
}
