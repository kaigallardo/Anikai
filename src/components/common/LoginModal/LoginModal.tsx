// src/components/common/LoginModal/LoginModal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  onLoginSuccess?: () => void;
}

export default function LoginModal({ 
  isOpen, 
  onClose, 
  title = 'Accede a tu cuenta',
  subtitle = 'Para guardar animes en tus listas',
  onLoginSuccess 
}: LoginModalProps) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingDiscord, setLoadingDiscord] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Login con email/password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let email = formData.emailOrUsername.trim();

      // Si no tiene @, buscar email por username
      if (!email.includes('@')) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles_rows')
          .select('email')
          .eq('username', email)
          .single();

        if (profileError || !profile?.email) {
          throw new Error('Usuario no encontrado. Intenta con tu email.');
        }
        email = profile.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      });

      if (error) throw error;

      // Éxito
      console.log('✅ Login exitoso en modal');
      
      // Cerrar modal
      onClose();
      
      // Llamar callback si existe
      if (onLoginSuccess) {
        setTimeout(onLoginSuccess, 300);
      }
      
    } catch (err: any) {
      console.error('❌ Error en login modal:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Login con Google
  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
    } catch (err: any) {
      console.error('❌ Error Google:', err);
      setError(err.message || 'Error al iniciar sesión con Google');
      setLoadingGoogle(false);
    }
  };

  // Login con Discord
  const handleDiscordLogin = async () => {
    try {
      setLoadingDiscord(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { 
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
    } catch (err: any) {
      console.error('❌ Error Discord:', err);
      setError(err.message || 'Error al iniciar sesión con Discord');
      setLoadingDiscord(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  // Si no está abierto, no renderizar
  if (!isOpen) return null;

  const isAnyLoading = loading || loadingGoogle || loadingDiscord;

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-content" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <button className="login-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Icono decorativo */}
        <div className="login-modal-icon">
          <svg viewBox="0 0 100 100" width="80" height="80">
            <defs>
              <linearGradient id="modalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e63946" />
                <stop offset="100%" stopColor="#c1121f" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#modalGradient)" opacity="0.2" />
            <circle cx="50" cy="50" r="35" fill="url(#modalGradient)" opacity="0.4" />
            <circle cx="50" cy="50" r="25" fill="url(#modalGradient)" />
          </svg>
        </div>

        {/* Título */}
        <div className="login-modal-header">
          <h2 className="login-modal-title">{title}</h2>
          <p className="login-modal-subtitle">{subtitle}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="login-modal-error">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="login-modal-form">
          <div className="form-group">
            <label className="form-label">
              <Mail size={18} />
              Email o Username
            </label>
            <input
              type="text"
              name="emailOrUsername"
              value={formData.emailOrUsername}
              onChange={handleChange}
              placeholder="tu@email.com o username"
              className="form-input"
              required
              disabled={isAnyLoading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={18} />
              Contraseña
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="form-input"
                required
                disabled={isAnyLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isAnyLoading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-login-modal"
            disabled={isAnyLoading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Divider */}
        <div className="login-modal-divider">
          <span>o continúa con</span>
        </div>

        {/* Social Login */}
        <div className="login-modal-social">
          <button
            type="button"
            className="social-btn social-btn--google"
            onClick={handleGoogleLogin}
            disabled={isAnyLoading}
          >
            {loadingGoogle ? (
              <span>Conectando...</span>
            ) : (
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

          <button
            type="button"
            className="social-btn social-btn--discord"
            onClick={handleDiscordLogin}
            disabled={isAnyLoading}
          >
            {loadingDiscord ? (
              <span>Conectando...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="login-modal-footer">
          <p>¿No tienes cuenta?</p>
          <button 
            className="link-button"
            onClick={() => {
              onClose();
              navigate('/registro');
            }}
          >
            Regístrate gratis
          </button>
        </div>
      </div>
    </div>
  );
}