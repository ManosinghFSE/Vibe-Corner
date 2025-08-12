import { useState, useEffect } from 'react';
import { useAuth } from '../modules/auth/AuthContext';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  teamId?: string;
}

export function useUsers(options?: { teamId?: string; excludeSelf?: boolean }) {
  const { getAuthHeader, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (options?.teamId) params.append('teamId', options.teamId);
        if (options?.excludeSelf) params.append('excludeSelf', 'true');
        
        const res = await fetch(`/api/users?${params}`, {
          headers: getAuthHeader()
        });
        
        if (!res.ok) throw new Error('Failed to fetch users');
        
        const data = await res.json();
        setUsers(data.users);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchUsers();
    }
  }, [user, options?.teamId, options?.excludeSelf]);

  return { users, loading, error };
} 