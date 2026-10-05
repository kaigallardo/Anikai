// src/pages/Settings/Settings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useTheme } from '../../hooks/useTheme';
import {
  Moon, Sun, Globe, Bell, Shield,
  Lock, Trash2, Eye, EyeOff, Check, X, ChevronRight
} from 'lucide-react';
import './Settings.css';

interface NotificationPrefs {
  new_episodes: boolean;
  new_releases: boolean;
  browser_push: boolean;
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, setDark, setLight } = useTheme();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState(i18n.language?.startsWith('en') ? 'en' : 'es');
  const [notifications, setNotifications] = useState<NotificationPrefs>({ new_episodes: false, new_releases: false, browser_push: false });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifsSaved, setNotifsSaved] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session);
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (userId) loadNotificationPrefs(); }, [userId]);
  useEffect(() => { setCurrentLang(i18n.language?.startsWith('en') ? 'en' : 'es'); }, [i18n.language]);

  const handleLanguageChange = (lang: 'es' | 'en') => {
    setCurrentLang(lang);
    i18n.changeLanguage(lang);
  };

  const loadNotificationPrefs = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase.from('profiles_rows').select('notification_prefs').eq('id', userId).single();
      if (data?.notification_prefs) setNotifications(data.notification_prefs);
    } catch {}
  };

  const handleToggleNotif = async (key: keyof NotificationPrefs) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    if (key === 'browser_push' && updated.browser_push) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') updated.browser_push = false;
    }
    setNotifications(updated);
    setSavingNotifs(true);
    try {
      await supabase.from('profiles_rows').update({ notification_prefs: updated }).eq('id', userId);
      setNotifsSaved(true);
      setTimeout(() => setNotifsSaved(false), 2000);
    } catch {}
    finally { setSavingNotifs(false); }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: t('settings.password_mismatch') }); return; }
    if (newPassword.length < 8) { setPasswordMsg({ type: 'error', text: t('settings.password_short') }); return; }
    try {
      setPasswordLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail!, password: currentPassword });
      if (signInError) throw new Error(t('settings.password_mismatch'));
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg({ type: 'success', text: t('settings.password_success') });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally { setPasswordLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== userEmail) return;
    try {
      setDeletingAccount(true);
      await supabase.from('profiles_rows').delete().eq('id', userId);
      await supabase.auth.signOut();
      navigate('/');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally { setDeletingAccount(false); }
  };

  if (!isLoggedIn) return (
    <div className="settings-page">
      <div className="settings-empty">
        <Shield size={64} />
        <h2>{t('settings.login_required')}</h2>
        <button className="btn btn--primary" onClick={() => navigate('/login')}>{t('settings.go_login')}</button>
      </div>
    </div>
  );

  return (
    <div className="settings-page">
      <div className="settings-container">

        {/* HEADER */}
        <div className="settings-header">
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </div>

        {/* ── 1. APARIENCIA ── */}
        <section className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h2>{t('settings.appearance')}</h2>
              <p>{t('settings.appearance_sub')}</p>
            </div>
          </div>

          <div className="settings-block">
            <p className="settings-block__label">{t('settings.theme')}</p>
            <div className="theme-options">

              {/* Oscuro */}
              <button
                className={`theme-option ${theme === 'dark' ? 'theme-option--active' : ''}`}
                onClick={setDark}
              >
                <div className="theme-option__preview theme-option__preview--dark">
                  <div /><div /><div />
                </div>
                <Moon size={16} />
                <span>{t('settings.theme_dark')}</span>
                {theme === 'dark' && <Check size={14} className="theme-option__check" />}
              </button>

              {/* Claro */}
              <button
                className={`theme-option ${theme === 'light' ? 'theme-option--active' : ''}`}
                onClick={setLight}
              >
                <div className="theme-option__preview theme-option__preview--light">
                  <div /><div /><div />
                </div>
                <Sun size={16} />
                <span>{t('settings.theme_light')}</span>
                {theme === 'light' && <Check size={14} className="theme-option__check" />}
              </button>

            </div>
          </div>
        </section>

        {/* ── 2. IDIOMA ── */}
        <section className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon"><Globe size={20} /></div>
            <div>
              <h2>{t('settings.language')}</h2>
              <p>{t('settings.language_sub')}</p>
            </div>
          </div>
          <div className="settings-block">
            <div className="language-options">
              <button className={`language-option ${currentLang === 'es' ? 'active' : ''}`} onClick={() => handleLanguageChange('es')}>
                <span className="language-option__flag">🇪🇸</span>
                <span className="language-option__name">Español</span>
                {currentLang === 'es' && <Check size={16} className="language-option__check" />}
              </button>
              <button className={`language-option ${currentLang === 'en' ? 'active' : ''}`} onClick={() => handleLanguageChange('en')}>
                <span className="language-option__flag">🇬🇧</span>
                <span className="language-option__name">English</span>
                {currentLang === 'en' && <Check size={16} className="language-option__check" />}
              </button>
            </div>
          </div>
        </section>

        {/* ── 3. NOTIFICACIONES ── */}
        <section className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon"><Bell size={20} /></div>
            <div>
              <h2>{t('settings.notifications')}</h2>
              <p>{t('settings.notifications_sub')}</p>
            </div>
            {notifsSaved && (
              <span className="settings-saved"><Check size={14} />{t('settings.saved')}</span>
            )}
          </div>
          <div className="settings-block">
            {([
              { key: 'new_episodes', label: t('settings.notif_new_episodes'), sub: t('settings.notif_new_episodes_sub') },
              { key: 'new_releases', label: t('settings.notif_new_releases'), sub: t('settings.notif_new_releases_sub') },
              { key: 'browser_push', label: t('settings.notif_browser'), sub: t('settings.notif_browser_sub') },
            ] as { key: keyof NotificationPrefs; label: string; sub: string }[]).map(item => (
              <div key={item.key} className="settings-row">
                <div className="settings-row__info">
                  <span className="settings-row__label">{item.label}</span>
                  <span className="settings-row__sub">{item.sub}</span>
                </div>
                <button
                  className={`toggle-switch ${notifications[item.key] ? 'on' : 'off'}`}
                  onClick={() => handleToggleNotif(item.key)}
                  disabled={savingNotifs}
                  aria-label={item.label}
                >
                  <span className="toggle-switch__thumb" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. SEGURIDAD ── */}
        <section className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon"><Lock size={20} /></div>
            <div>
              <h2>{t('settings.security')}</h2>
              <p>{t('settings.security_sub')}</p>
            </div>
          </div>
          <div className="settings-block">
            <div className="settings-row settings-row--clickable" onClick={() => setShowPasswordForm(!showPasswordForm)}>
              <div className="settings-row__info">
                <span className="settings-row__label">{t('settings.change_password')}</span>
                <span className="settings-row__sub">{t('settings.change_password_sub')}</span>
              </div>
              <ChevronRight size={20} className={`settings-row__chevron ${showPasswordForm ? 'rotated' : ''}`} />
            </div>

            {showPasswordForm && (
              <div className="password-form">
                <div className="form-group">
                  <label>{t('settings.current_password')}</label>
                  <div className="input-password">
                    <input type={showCurrentPwd ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)}>{showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('settings.new_password')}</label>
                  <div className="input-password">
                    <input type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)}>{showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('settings.confirm_password')}</label>
                  <div className="input-password">
                    <input type={showConfirmPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>{showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                {passwordMsg && (
                  <div className={`password-msg password-msg--${passwordMsg.type}`}>
                    {passwordMsg.type === 'success' ? <Check size={16} /> : <X size={16} />}
                    {passwordMsg.text}
                  </div>
                )}
                <div className="password-form__actions">
                  <button className="btn btn--secondary" onClick={() => { setShowPasswordForm(false); setPasswordMsg(null); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>{t('common.cancel')}</button>
                  <button className="btn btn--primary" onClick={handleChangePassword} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}>
                    {passwordLoading ? t('settings.updating') : t('settings.update_password')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 5. ZONA DE PELIGRO ── */}
        <section className="settings-section settings-section--danger">
          <div className="settings-section__header">
            <div className="settings-section__icon settings-section__icon--danger"><Trash2 size={20} /></div>
            <div>
              <h2>{t('settings.danger_zone')}</h2>
              <p>{t('settings.danger_zone_sub')}</p>
            </div>
          </div>
          <div className="settings-block">
            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__label">{t('settings.delete_account')}</span>
                <span className="settings-row__sub">{t('settings.delete_account_sub')}</span>
              </div>
              <button className="btn btn--danger" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={16} />{t('settings.delete_account_btn')}
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* ── MODAL ELIMINAR CUENTA ── */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal--danger" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDeleteModal(false)}><X size={24} /></button>
            <div className="delete-modal__icon"><Trash2 size={40} /></div>
            <h2>{t('settings.delete_confirm_title')}</h2>
            <p>{t('settings.delete_confirm_text')}</p>
            <div className="form-group">
              <label>{t('settings.delete_confirm_label', { email: userEmail })}</label>
              <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={userEmail || ''} className="delete-confirm-input" />
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}>{t('common.cancel')}</button>
              <button className="btn btn--danger" onClick={handleDeleteAccount} disabled={deleteConfirmText !== userEmail || deletingAccount}>
                {deletingAccount ? t('settings.deleting') : t('settings.delete_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}