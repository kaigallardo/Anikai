// src/components/layout/header/Header.tsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, LogIn, UserPlus, Settings, LogOut, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import logoNormal from "@/assets/images/Anikai_Logo.png";
import './Header.css';

export default function Header() {
  const { t } = useTranslation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const loadUserProfile = async (userId: string, email: string) => {
    setUserEmail(email);
    try {
      const { data: profile } = await supabase
        .from('profiles_rows')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();
      setUserName(profile?.username || email.split('@')[0]);
      setUserAvatar(profile?.avatar_url || null);
    } catch {
      setUserName(email.split('@')[0]);
      setUserAvatar(null);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoggedIn(true);
        await loadUserProfile(session.user.id, session.user.email || '');
      } else {
        setIsLoggedIn(false);
        setUserEmail(null);
        setUserName(null);
        setUserAvatar(null);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          setIsLoggedIn(false);
          setUserEmail(null);
          setUserName(null);
          setUserAvatar(null);
          setIsLoggingOut(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setIsLoggedIn(true);
          loadUserProfile(session.user.id, session.user.email || '');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', isMenuOpen);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);

    const forceLogout = () => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });
      setIsLoggedIn(false);
      setUserEmail(null);
      setUserName(null);
      setUserAvatar(null);
      setIsLoggingOut(false);
    };

    const timeoutId = setTimeout(() => {
      console.warn('[LOGOUT] Timeout — forzando cierre local');
      forceLogout();
    }, 3000);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[LOGOUT] Error:', err);
    } finally {
      clearTimeout(timeoutId);
      forceLogout();
    }
  };

  const AvatarIcon = ({ size = 20 }: { size?: number }) => {
    if (userAvatar) {
      return (
        <img
          src={userAvatar}
          alt={userName || 'Avatar'}
          style={{ width: size + 12, height: size + 12, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          onError={() => setUserAvatar(null)}
        />
      );
    }
    return <User size={size} />;
  };

  return (
    <>
      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
        <nav className="header__nav">

          <Link to="/" className="header__logo">
            <img src={logoNormal} alt="Anikai" className="header__logo-img" />
            <span className="header__logo-text">Anikai</span>
          </Link>

          <nav className="desktopNav">
            <Link to="/" className={`desktopNav__link ${location.pathname === '/' ? 'active' : ''}`}>
              {t('nav.home')}
            </Link>
            <Link to="/recomendaciones" className={`desktopNav__link ${location.pathname === '/recomendaciones' ? 'active' : ''}`}>
              {t('nav.recommendations')}
            </Link>
            <Link to="/catalogo" className={`desktopNav__link ${location.pathname === '/catalogo' ? 'active' : ''}`}>
              {t('nav.catalog')}
            </Link>
            <Link to="/listas" className={`desktopNav__link ${location.pathname === '/listas' ? 'active' : ''}`}>
              {t('nav.lists')}
            </Link>

            <div
              ref={userMenuRef}
              className="user-menu"
              onMouseEnter={() => setIsUserMenuOpen(true)}
              onMouseLeave={() => setIsUserMenuOpen(false)}
            >
              <button className="user-menu__trigger">
                <div className={`user-menu__avatar ${userAvatar ? 'user-menu__avatar--photo' : ''}`}>
                  <AvatarIcon size={20} />
                </div>
                <ChevronDown size={16} className={`user-menu__arrow ${isUserMenuOpen ? 'rotated' : ''}`} />
              </button>

              <div className={`user-menu__dropdown ${isUserMenuOpen ? 'visible' : ''}`}>
                {isLoggedIn ? (
                  <>
                    <div className="user-menu__header">
                      <div className={`user-menu__user-avatar ${userAvatar ? 'user-menu__user-avatar--photo' : ''}`}>
                        <AvatarIcon size={32} />
                      </div>
                      <div className="user-menu__user-info">
                        <span className="user-menu__username">{userName || t('nav.guest')}</span>
                        <span className="user-menu__email">{userEmail}</span>
                      </div>
                    </div>
                    <div className="user-menu__divider" />
                    <Link to="/perfil" className="user-menu__item">
                      <User size={18} />{t('nav.profile')}
                    </Link>
                    <Link to="/configuracion" className="user-menu__item">
                      <Settings size={18} />{t('nav.settings')}
                    </Link>
                    <div className="user-menu__divider" />
                    <button
                      type="button"
                      className="user-menu__item user-menu__item--danger"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      <LogOut size={18} />
                      {isLoggingOut ? t('nav.closing') : t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="user-menu__guest-header">
                      <p>{t('nav.login')}</p>
                      <span>{t('lists.login_sub')}</span>
                    </div>
                    <div className="user-menu__divider" />
                    <Link to="/login" className="user-menu__item">
                      <LogIn size={18} />{t('nav.login')}
                    </Link>
                    <Link to="/registro" className="user-menu__item user-menu__item--primary">
                      <UserPlus size={18} />{t('nav.register')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>

          <button
            className={`hamburgerButton ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={t('nav.navigation')}
          >
            <span></span><span></span><span></span>
          </button>
        </nav>
      </header>

      {isMenuOpen && (
        <div className="mobileMenu" onClick={() => setIsMenuOpen(false)}>
          <div className="mobileMenu__content" onClick={e => e.stopPropagation()}>

            <div className="mobileMenu__user-section">
              <div className={`mobileMenu__user-avatar ${userAvatar ? 'mobileMenu__user-avatar--photo' : ''}`}>
                <AvatarIcon size={32} />
              </div>
              {isLoggedIn ? (
                <div className="mobileMenu__user-info">
                  <span className="mobileMenu__username">{userName || t('nav.guest')}</span>
                  <span className="mobileMenu__email">{userEmail}</span>
                </div>
              ) : (
                <div className="mobileMenu__guest-info">
                  <span className="mobileMenu__guest-text">{t('nav.guest')}</span>
                </div>
              )}
            </div>

            <div className="mobileMenu__divider" />

            <div className="mobileMenu__section">
              <span className="mobileMenu__section-title">{t('nav.navigation')}</span>
              <Link to="/" className={`mobileMenu__link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                {t('nav.home')}
              </Link>
              <Link to="/recomendaciones" className={`mobileMenu__link ${location.pathname === '/recomendaciones' ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                {t('nav.recommendations')}
              </Link>
              <Link to="/catalogo" className={`mobileMenu__link ${location.pathname === '/catalogo' ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                {t('nav.catalog')}
              </Link>
              <Link to="/listas" className={`mobileMenu__link ${location.pathname === '/listas' ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                {t('nav.lists')}
              </Link>
            </div>

            <div className="mobileMenu__divider" />

            {isLoggedIn && (
              <div className="mobileMenu__section">
                <span className="mobileMenu__section-title">{t('nav.account')}</span>
                <Link to="/perfil" className="mobileMenu__link" onClick={() => setIsMenuOpen(false)}>
                  <User size={18} />{t('nav.profile')}
                </Link>
                <Link to="/configuracion" className="mobileMenu__link" onClick={() => setIsMenuOpen(false)}>
                  <Settings size={18} />{t('nav.settings')}
                </Link>
              </div>
            )}

            <div className="mobileMenu__section">
              {isLoggedIn ? (
                <button
                  type="button"
                  className="mobileMenu__button mobileMenu__button--danger"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut size={18} />
                  {isLoggingOut ? t('nav.closing') : t('nav.logout')}
                </button>
              ) : (
                <>
                  <Link to="/login" className="mobileMenu__button mobileMenu__button--secondary" onClick={() => setIsMenuOpen(false)}>
                    <LogIn size={18} />{t('nav.login')}
                  </Link>
                  <Link to="/registro" className="mobileMenu__button mobileMenu__button--primary" onClick={() => setIsMenuOpen(false)}>
                    <UserPlus size={18} />{t('nav.register')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}