import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Deep-teal splash: ~1.5s, then welcome (logged out) or dashboard (logged in). */
export default function Splash() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      navigate(user ? '/dashboard' : '/welcome', { replace: true });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand">
      <img
        src="/assets/logo-white.png"
        alt="Daybill"
        className="w-40 animate-pulse-soft"
      />
    </div>
  );
}
