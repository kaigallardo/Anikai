// src/pages/Profile/Profile.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  User, Edit2, Check, X, Camera, Shield, ShieldOff,
  Clock, Star, Heart, BookOpen, TrendingUp, Folder,
  Play, CheckCircle, Eye, EyeOff, Save
} from 'lucide-react';
import './Profile.css';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
}

interface Stats {
  total_animes: number;
  completed: number;
  watching: number;
  planned: number;
  dropped: number;
  total_episodes: number;
  total_hours: number;
  top_genres: { genre: string; count: number }[];
  mean_score: number;
}

interface UserList {
  id: string;
  name: string;
  color: string;
  icon: string;
  anime_count: number;
  type: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de autenticación
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados de perfil
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // Estados de avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Estados de estadísticas
  const [stats, setStats] = useState<Stats | null>(null);

  // Estados de listas
  const [userLists, setUserLists] = useState<UserList[]>([]);

  // ───────────────────────────────────────────────────────────────────────────
  // EFECTO: Verificar autenticación
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
        return;
      }
      setUserId(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate('/login');
      else setUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // EFECTO: Cargar datos cuando hay userId
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchStats();
      fetchLists();
    }
  }, [userId]);

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Obtener perfil
  // ───────────────────────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles_rows')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      setNewUsername(data.username || '');
    } catch (err) {
      console.error('Error al cargar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Obtener estadísticas
  // ───────────────────────────────────────────────────────────────────────────
  const fetchStats = async () => {
  if (!userId) return;
  try {
    const listIds = await getUserListIds();
    if (listIds.length === 0) return;

    const { data: listAnimes, error } = await supabase
      .from('user_list_animes_rows')
      .select(`
        anime_id,
        status,
        score,
        episodes_watched,
        animes (genres, episodes)
      `)
      .in('list_id', listIds);

    if (error) throw error;
    if (!listAnimes) return;

    // ── DEDUPLICAR por anime_id ──────────────────────────────────────────
    // Si el mismo anime está en varias listas, nos quedamos con el que
    // tenga el estado más "avanzado" (completed > watching > dropped > planned)
    const statusPriority: Record<string, number> = {
      completed: 4, watching: 3, dropped: 2, planned: 1
    };

    const animeMap = new Map<number, any>();
    listAnimes.forEach((entry: any) => {
      const existing = animeMap.get(entry.anime_id);
      if (!existing) {
        animeMap.set(entry.anime_id, entry);
      } else {
        const existingPriority = statusPriority[existing.status] || 0;
        const newPriority = statusPriority[entry.status] || 0;
        if (newPriority > existingPriority) {
          animeMap.set(entry.anime_id, entry);
        }
      }
    });

    const unique = Array.from(animeMap.values());
    // ────────────────────────────────────────────────────────────────────

    const completed = unique.filter(a => a.status === 'completed').length;
    const watching  = unique.filter(a => a.status === 'watching').length;
    const planned   = unique.filter(a => a.status === 'planned').length;
    const dropped   = unique.filter(a => a.status === 'dropped').length;

    // Solo contar episodios de completados y viendo
    const totalEpisodes = unique
      .filter(a => a.status === 'completed' || a.status === 'watching')
      .reduce((acc, a) => acc + (a.episodes_watched || 0), 0);

    const totalHours = Math.round((totalEpisodes * 24) / 60);

    const scores = unique.filter(a => a.score > 0).map(a => a.score);
    const meanScore = scores.length > 0
      ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    // Géneros de animes únicos
    const genreCount: Record<string, number> = {};
    unique.forEach(a => {
      const genres = (a.animes as any)?.genres || [];
      genres.forEach((g: string) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });
    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, count }));

    setStats({
      total_animes: unique.length,
      completed, watching, planned, dropped,
      total_episodes: totalEpisodes,
      total_hours: totalHours,
      top_genres: topGenres,
      mean_score: meanScore,
    });
  } catch (err) {
    console.error('Error al cargar estadísticas:', err);
  }
};

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN AUXILIAR: Obtener IDs de listas del usuario
  // ───────────────────────────────────────────────────────────────────────────
  const getUserListIds = async (): Promise<string[]> => {
    const { data } = await supabase
      .from('user_lists_rows')
      .select('id')
      .eq('user_id', userId);
    return data?.map(l => l.id) || [];
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Obtener listas
  // ───────────────────────────────────────────────────────────────────────────
  const fetchLists = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc('get_user_lists_rows', { p_user_id: userId });
      if (error) throw error;
      setUserLists(data || []);
    } catch (err) {
      console.error('Error al cargar listas:', err);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Guardar username
  // ───────────────────────────────────────────────────────────────────────────
  const handleSaveUsername = async () => {
    if (!newUsername.trim() || !userId) return;
    if (newUsername.trim().length < 3) {
      setUsernameError(t('profile.username_min'));
      return;
    }
    if (newUsername.trim().length > 20) {
      setUsernameError(t('profile.username_max'));
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername.trim())) {
      setUsernameError(t('profile.username_chars'));
      return;
    }

    try {
      setSavingUsername(true);
      setUsernameError('');

      const { error } = await supabase
        .from('profiles_rows')
        .update({ username: newUsername.trim(), updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
      setEditingUsername(false);
    } catch (err: any) {
      setUsernameError(err.message || t('common.error'));
    } finally {
      setSavingUsername(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Subir avatar
  // ───────────────────────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validar tipo y tamaño
    if (!file.type.startsWith('image/')) {
      alert(t('profile.avatar_type_error'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert(t('profile.avatar_size_error'));
      return;
    }

    try {
      setUploadingAvatar(true);

      // Preview local
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      // Subir a Supabase Storage
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Guardar URL en perfil
      const { error: updateError } = await supabase
        .from('profiles_rows')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    } catch (err: any) {
      console.error('Error al subir avatar:', err);
      alert(t('profile.avatar_upload_error') + err.message);
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Toggle perfil público/privado
  // ───────────────────────────────────────────────────────────────────────────
  const handleTogglePublic = async () => {
    if (!profile || !userId) return;
    try {
      const newValue = !profile.is_public;
      const { error } = await supabase
        .from('profiles_rows')
        .update({ is_public: newValue, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      setProfile(prev => prev ? { ...prev, is_public: newValue } : null);
    } catch (err: any) {
      console.error('Error al cambiar visibilidad:', err);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Icono de lista
  // ───────────────────────────────────────────────────────────────────────────
  const getListIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      'play': <Play size={16} />,
      'check-circle': <CheckCircle size={16} />,
      'clock': <Clock size={16} />,
      'heart': <Heart size={16} />,
      'folder': <Folder size={16} />,
    };
    return icons[iconName] || <Folder size={16} />;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER: Loading
  // ───────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loading-spinner" />
          <p>{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const avatarSrc = avatarPreview || profile.avatar_url;
  const memberSince = new Date(profile.created_at).toLocaleDateString(
    i18n.language === 'en' ? 'en-US' : 'es-ES',
    { year: 'numeric', month: 'long' }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="profile-page">

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <div className="profile-hero">
        <div className="profile-hero__bg" />

        <div className="profile-hero__content">

          {/* Avatar */}
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar">
              {avatarSrc ? (
                <img src={avatarSrc} alt={profile.username} />
              ) : (
                <User size={48} />
              )}
              {uploadingAvatar && (
                <div className="profile-avatar__uploading">
                  <div className="loading-spinner loading-spinner--small" />
                </div>
              )}
            </div>
            <button
              className="profile-avatar__edit"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              title={t('profile.change_photo')}
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* Info */}
          <div className="profile-hero__info">

            {/* Username editable */}
            <div className="profile-username-row">
              {editingUsername ? (
                <div className="profile-username-edit">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => { setNewUsername(e.target.value); setUsernameError(''); }}
                    className="profile-username-input"
                    maxLength={20}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUsername();
                      if (e.key === 'Escape') setEditingUsername(false);
                    }}
                  />
                  <button
                    className="profile-icon-btn profile-icon-btn--success"
                    onClick={handleSaveUsername}
                    disabled={savingUsername}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="profile-icon-btn"
                    onClick={() => { setEditingUsername(false); setUsernameError(''); setNewUsername(profile.username); }}
                  >
                    <X size={16} />
                  </button>
                  {usernameError && <span className="profile-username-error">{usernameError}</span>}
                </div>
              ) : (
                <>
                  <h1 className="profile-username">{profile.username}</h1>
                  <button
                    className="profile-icon-btn"
                    onClick={() => setEditingUsername(true)}
                    title={t('profile.edit_username')}
                  >
                    <Edit2 size={16} />
                  </button>
                </>
              )}
            </div>

            <p className="profile-email">{profile.email}</p>
            <p className="profile-since">{t('profile.member_since', { date: memberSince })}</p>

            {/* Toggle público/privado */}
            <button
              className={`profile-visibility-btn ${profile.is_public ? 'public' : 'private'}`}
              onClick={handleTogglePublic}
            >
              {profile.is_public ? (
                <><Eye size={16} />{t('profile.public_profile')}</>
              ) : (
                <><EyeOff size={16} />{t('profile.private_profile')}</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="profile-body">

        {/* ── ESTADÍSTICAS ──────────────────────────────────────────────────── */}
        {stats && (
          <section className="profile-section">
            <h2 className="profile-section-title">
              <TrendingUp size={20} />
              {t('profile.stats')}
            </h2>

            {/* Stats principales */}
            <div className="profile-stats-grid">
              <div className="stat-card">
                <span className="stat-card__value">{stats.total_animes}</span>
                <span className="stat-card__label">{t('profile.total_animes')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__value">{stats.total_episodes}</span>
                <span className="stat-card__label">{t('profile.episodes')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__value">{stats.total_hours}h</span>
                <span className="stat-card__label">{t('profile.hours_watched')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__value">{stats.mean_score > 0 ? stats.mean_score : '—'}</span>
                <span className="stat-card__label">{t('profile.mean_score')}</span>
              </div>
            </div>

            {/* Desglose por estado */}
            <div className="profile-status-breakdown">
              <div className="status-item" style={{ '--status-color': '#3b82f6' } as any}>
                <Play size={14} />
                <span>{t('profile.watching')}</span>
                <strong>{stats.watching}</strong>
              </div>
              <div className="status-item" style={{ '--status-color': '#2a9d8f' } as any}>
                <CheckCircle size={14} />
                <span>{t('profile.completed')}</span>
                <strong>{stats.completed}</strong>
              </div>
              <div className="status-item" style={{ '--status-color': '#f4a261' } as any}>
                <Clock size={14} />
                <span>{t('profile.planned')}</span>
                <strong>{stats.planned}</strong>
              </div>
              <div className="status-item" style={{ '--status-color': '#e63946' } as any}>
                <X size={14} />
                <span>{t('profile.dropped')}</span>
                <strong>{stats.dropped}</strong>
              </div>
            </div>

            {/* Géneros favoritos */}
            {stats.top_genres.length > 0 && (
              <div className="profile-genres">
                <h3>{t('profile.favorite_genres')}</h3>
                <div className="profile-genres__list">
                  {stats.top_genres.map(({ genre, count }, i) => (
                    <div key={genre} className="genre-bar">
                      <div className="genre-bar__info">
                        <span className="genre-bar__rank">#{i + 1}</span>
                        <span className="genre-bar__name">{genre}</span>
                        <span className="genre-bar__count">{count}</span>
                      </div>
                      <div className="genre-bar__track">
                        <div
                          className="genre-bar__fill"
                          style={{
                            width: `${(count / stats.top_genres[0].count) * 100}%`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── LISTAS ────────────────────────────────────────────────────────── */}
        <section className="profile-section">
          <h2 className="profile-section-title">
            <Folder size={20} />
            {t('profile.my_lists')}
          </h2>

          <div className="profile-lists-grid">
            {userLists.map(list => (
              <div
                key={list.id}
                className="profile-list-card"
                onClick={() => navigate('/listas')}
                style={{ borderLeft: `3px solid ${list.color}` }}
              >
                <div className="profile-list-card__icon" style={{ color: list.color }}>
                  {getListIcon(list.icon)}
                </div>
                <div className="profile-list-card__info">
                  <span className="profile-list-card__name">{list.name}</span>
                  <span className="profile-list-card__count">{list.anime_count} {t('lists.animes_bullet')}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}