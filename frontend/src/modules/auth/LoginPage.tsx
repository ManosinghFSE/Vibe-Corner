import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import clsx from 'clsx';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export const LoginPage: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const isValid = useMemo(() => schema.safeParse({ email, password }).success, [email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValid) return;
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error || 'Login failed');
    else navigate('/dashboard');
  }

  return (
    <div className="login-page min-h-screen header-gradient d-grid place-items-center p-4">
      <div className="login-layout glass rounded-4 shadow-2xl overflow-hidden w-100" style={{maxWidth: '1050px'}}>
        {/* Visual panel */}
        <div className="login-visual p-4 p-md-5 d-flex flex-column justify-content-between text-white">
          <div>
            <div className="d-flex align-items-center gap-3 mb-4 mb-md-5">
              <div className="logo-tile">VC</div>
              <div>
                <div className="fs-4 fw-semibold">VibeCorner</div>
                <div className="small opacity-90">Connect. Plan. Celebrate.</div>
              </div>
            </div>
            <h2 className="fs-2 fw-semibold lh-sm mb-2">Welcome back</h2>
            <p className="small opacity-90 mb-0">
              Sign in to collaborate with your team, plan events, split bills, and keep the vibes high.
            </p>
          </div>
          <div className="badges-row">
            <span className="badge">Secure</span>
            <span className="badge">SSO Ready</span>
            <span className="badge">Accessible</span>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-4 p-md-5 bg-white">
          <div className="mb-4">
            <h1 className="h5 fw-semibold text-[#201F1E] mb-1">Sign in</h1>
            <p className="small text-[#605E5C] mb-0">Use your work account to continue</p>
          </div>

          <form onSubmit={onSubmit} className="vstack gap-3">
            <div>
              <label className="label">Email</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-0 ps-3"><i className="fa-solid fa-envelope"></i></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control input"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-0 ps-3"><i className="fa-solid fa-lock"></i></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control input"
                  placeholder="********"
                  autoComplete="current-password"
                  required
                  minLength={8}
                />
                <button type="button" className="btn btn-light input-addon border-0" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <i className={showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
                </button>
              </div>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <label className="d-flex align-items-center gap-2 small text-[#201F1E]">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
                </label>
                <div className="text-end" style={{minWidth: '8rem'}}>
                  <button type="button" className="btn btn-link p-0 help-link">Need help?</button>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}

            <div className="vstack gap-2">
              <button
                type="submit"
                disabled={!isValid || loading}
                className={clsx('btn btn-primary w-100')}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                className="btn btn-sso w-100"
                onClick={() => alert('SSO flow not configured')}
              >
                <i className="fa-brands fa-microsoft me-2"></i> Sign in with Microsoft
              </button>
            </div>
          </form>

          <div className="mt-4 small text-[#605E5C]">
            <p className="mb-0">By signing in, you agree to the Terms and acknowledge the Privacy Policy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 
