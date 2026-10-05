// src/pages/Auth/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import './Login.css';

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingDiscord, setLoadingDiscord] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ emailOrUsername: '', password: '', rememberMe: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/');
    });
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true); setError(null);
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || t('auth.error_timeout'));
      setLoadingGoogle(false);
    }
  };

  const handleDiscordLogin = async () => {
    try {
      setLoadingDiscord(true); setError(null);
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: `${window.location.origin}/` } });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || t('auth.error_timeout'));
      setLoadingDiscord(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      let email = formData.emailOrUsername.trim();
      if (!email.includes('@')) {
        const result = await withTimeout(
          supabase.from('profiles_rows').select('email').eq('username', email).single(), 5000
        );
        if (result.error || !result.data?.email) throw new Error(t('auth.error_user_not_found'));
        email = result.data.email;
      }
      const authResult = await withTimeout(
        supabase.auth.signInWithPassword({ email, password: formData.password }), 8000
      );
      if (authResult.error) {
        const msg = authResult.error.message;
        if (msg.includes('Invalid login credentials')) throw new Error(t('auth.error_invalid_credentials'));
        if (msg.includes('Email not confirmed')) throw new Error(t('auth.error_email_not_confirmed'));
        throw new Error(msg);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message === 'TIMEOUT' ? t('auth.error_timeout') : err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const isAnyLoading = loading || loadingGoogle || loadingDiscord;

  return (
    <div className="login-page">
      <div className="login-background"><div className="login-overlay" /></div>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">{t('auth.welcome')}</h1>
            <p className="login-subtitle">{t('auth.login_subtitle')}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label"><Mail size={18} />{t('auth.email_or_username')}</label>
              <input type="text" name="emailOrUsername" value={formData.emailOrUsername}
                onChange={handleChange} placeholder={t('auth.email_or_username_placeholder')}
                className="form-input" required autoComplete="username" />
            </div>
            <div className="form-group">
              <label className="form-label"><Lock size={18} />{t('auth.password')}</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? 'text' : 'password'} name="password"
                  value={formData.password} onChange={handleChange} placeholder="••••••••"
                  className="form-input" required autoComplete="current-password" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} />
                <span>{t('auth.remember_me')}</span>
              </label>
              <Link to="/recuperar" className="forgot-password">{t('auth.forgot_password')}</Link>
            </div>
            <button type="submit" className="btn-login" disabled={isAnyLoading}>
              {loading ? t('auth.logging_in') : t('auth.login_btn')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="login-divider"><span>{t('auth.or_continue')}</span></div>

          <div className="social-login">
            <button type="button" className="social-btn social-btn--google" onClick={handleGoogleLogin} disabled={isAnyLoading}>
              {loadingGoogle ? <span>{t('auth.connecting')}</span> : (
                <>
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </>
              )}
            </button>
            <button type="button" className="social-btn social-btn--discord" onClick={handleDiscordLogin} disabled={isAnyLoading}>
              {loadingDiscord ? <span>{t('auth.connecting')}</span> : (
                <>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Discord
                </>
              )}
            </button>
          </div>

          <div className="login-footer">
            <p>{t('auth.no_account')}</p>
            <Link to="/registro" className="register-link">{t('auth.register_free')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}