// src/pages/AnimeDetail/AnimeDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import LoginModal from '../../components/common/LoginModal';
import { 
  Star, Calendar, Clock, Play, Heart, Plus, Check,
  Share2, BookOpen, X
} from 'lucide-react';
import './AnimeDetail.css';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface Anime {
  id: number;
  title: string;
  slug: string;
  image: string;
  synopsis: string;
  rating: number;
  popularity: number;
  year: number;
  episodes: number;
  status: string;
  type: string;
  genres: string[];
  studios: string[];
}

interface UserList {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  anime_count: number;
}

type WatchStatus = 'watching' | 'completed' | 'planned' | 'dropped' | '';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function AnimeDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Anime
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Modales / UI
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showListSelector, setShowListSelector] = useState(false);

  // Listas
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [animeInListIds, setAnimeInListIds] = useState<string[]>([]);
  const [isInLists, setIsInLists] = useState(false);
  const [togglingList, setTogglingList] = useState<string | null>(null);

  // Panel de seguimiento
  const [trackingListId, setTrackingListId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<WatchStatus>('');
  const [episodesWatched, setEpisodesWatched] = useState<number>(0);
  const [userScore, setUserScore] = useState<number>(0); // 0 = sin puntuar
  const [hoveredScore, setHoveredScore] = useState<number>(0);
  const [savingTracking, setSavingTracking] = useState(false);
  const [trackingDirty, setTrackingDirty] = useState(false);

  // Me gusta
  const [isLiked, setIsLiked] = useState(false);
  const [likeListId, setLikeListId] = useState<string | null>(null);
  const [likingAnime, setLikingAnime] = useState(false);

  // Compartir
  const [copied, setCopied] = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // EFECTOS
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (id) fetchAnime(id);
  }, [id]);

  useEffect(() => {
    if (isLoggedIn && userId) {
      fetchUserLists();
      checkIfInLists();
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (isLoggedIn && userId && anime) {
      supabase
        .from('user_lists')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'Me gusta')
        .maybeSingle()
        .then(({ data }) => {
          if (!data?.id) return;
          setLikeListId(data.id);
          supabase
            .from('user_list_animes')
            .select('id')
            .eq('list_id', data.id)
            .eq('anime_id', anime.id)
            .maybeSingle()
            .then(({ data: entry }) => setIsLiked(!!entry));
        });
    }
  }, [isLoggedIn, userId, anime]);

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Episodios según estado
  // ───────────────────────────────────────────────────────────────────────────
  const getEpisodesForStatus = (status: WatchStatus, totalEps: number): number => {
    if (status === 'completed') return totalEps;
    if (status === 'planned') return 0;
    return episodesWatched;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Obtener anime
  // ───────────────────────────────────────────────────────────────────────────
  const fetchAnime = async (animeId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
      .from('animes').select('*').eq('id', animeId).single();
      if (error) throw error;
      if (!data) throw new Error('Anime no encontrado');
      setAnime(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el anime');
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Obtener listas
  // ───────────────────────────────────────────────────────────────────────────
  const fetchUserLists = async () => {
    if (!userId) return;
    const { data } = await supabase.rpc('get_user_lists', { p_user_id: userId });
    setUserLists(data || []);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Verificar en qué listas está + cargar seguimiento + score
  // ───────────────────────────────────────────────────────────────────────────
  const checkIfInLists = async () => {
    if (!userId || !id) return;
    try {
      const { data } = await supabase
        .from('user_list_animes')
        .select('list_id, status, episodes_watched, score')
        .eq('anime_id', id);

      const listIds = data?.map((d: any) => d.list_id) || [];
      setAnimeInListIds(listIds);
      setIsInLists(listIds.length > 0);

      if (data && data.length > 0) {
        const first = data[0];
        setTrackingListId(first.list_id);
        setCurrentStatus(first.status || '');
        setEpisodesWatched(first.episodes_watched || 0);
        setUserScore(first.score || 0);
      }
    } catch (err) {
      console.error('Error al verificar listas:', err);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Toggle lista con checkbox
  // ───────────────────────────────────────────────────────────────────────────
  const handleToggleList = async (listId: string) => {
    if (!anime || !userId || togglingList) return;
    setTogglingList(listId);
    const isIn = animeInListIds.includes(listId);
    try {
      if (isIn) {
        await supabase.rpc('remove_anime_from_list', { p_list_id: listId, p_anime_id: anime.id });
        const newIds = animeInListIds.filter(l => l !== listId);
        setAnimeInListIds(newIds);
        setIsInLists(newIds.length > 0);
        if (trackingListId === listId) {
          setTrackingListId(null);
          setCurrentStatus('');
          setEpisodesWatched(0);
          setUserScore(0);
        }
      } else {
        await supabase.rpc('add_anime_to_list', { p_list_id: listId, p_anime_id: anime.id, p_status: 'planned' });
        const newIds = [...animeInListIds, listId];
        setAnimeInListIds(newIds);
        setIsInLists(true);
        if (!trackingListId) {
          setTrackingListId(listId);
          setCurrentStatus('planned');
          setEpisodesWatched(0);
          setUserScore(0);
        }
      }
      fetchUserLists();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setTogglingList(null);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Guardar seguimiento (incluye score)
  // ───────────────────────────────────────────────────────────────────────────
  const handleSaveTracking = async () => {
    if (!trackingListId || !anime || !userId) return;
    try {
      setSavingTracking(true);

      const eps = getEpisodesForStatus(currentStatus, anime.episodes || 0);

      const { error } = await supabase
        .from('user_list_animes')
        .update({
          status: currentStatus || 'planned',
          episodes_watched: eps,
          score: userScore,
          updated_at: new Date().toISOString(),
        })
        .eq('list_id', trackingListId)
        .eq('anime_id', anime.id);

      if (error) throw error;
      setEpisodesWatched(eps);
      setTrackingDirty(false);
    } catch (err: any) {
      console.error('Error al guardar seguimiento:', err);
      alert('Error: ' + err.message);
    } finally {
      setSavingTracking(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Me gusta
  // ───────────────────────────────────────────────────────────────────────────
  const getOrCreateLikeList = async (): Promise<string | null> => {
    if (!userId) return null;
    const { data: existing } = await supabase
      .from('user_lists').select('id').eq('user_id', userId).eq('name', 'Me gusta').maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created, error } = await supabase
      .from('user_lists')
      .insert({ user_id: userId, name: 'Me gusta', type: 'system', color: '#ec4899', icon: 'heart', is_public: false })
      .select('id').single();
    if (error) return null;
    return created?.id || null;
  };

  const handleLike = async () => {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    if (!anime || likingAnime) return;
    setLikingAnime(true);
    try {
      const listId = likeListId || await getOrCreateLikeList();
      if (!listId) return;
      setLikeListId(listId);
      if (isLiked) {
        await supabase.rpc('remove_anime_from_list', { p_list_id: listId, p_anime_id: anime.id });
        setIsLiked(false);
      } else {
        await supabase.rpc('add_anime_to_list', { p_list_id: listId, p_anime_id: anime.id, p_status: 'completed' });
        setIsLiked(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLikingAnime(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Compartir
  // ───────────────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    try { await navigator.clipboard.writeText(window.location.href); }
    catch {
      const el = document.createElement('textarea');
      el.value = window.location.href;
      document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    setShowListSelector(true);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // RENDERS DE ESTADO
  // ───────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="anime-detail-page">
      <div className="anime-detail-loading">
        <div className="loading-spinner" />
        <p>{t('anime.loading')}</p>
      </div>
    </div>
  );

  if (error || !anime) return (
    <div className="anime-detail-page">
      <div className="anime-detail-error">
        <h1>❌ {t('common.error')}</h1>
        <p>{error || t('anime.not_found')}</p>
        <button onClick={() => navigate('/catalogo')}>{t('anime.back_catalog')}</button>
      </div>
    </div>
  );

  const showEpisodesInput = currentStatus === 'watching' || currentStatus === 'dropped';
  // Puntuación a mostrar (hover tiene prioridad sobre la guardada)
  const displayScore = hoveredScore || userScore;

  // STATUS_OPTIONS con labels traducidas
  const STATUS_OPTIONS: { value: WatchStatus; label: string; color: string }[] = [
    { value: 'watching',  label: t('anime.tracking.watching'),  color: '#3b82f6' },
    { value: 'completed', label: t('anime.tracking.completed'), color: '#2a9d8f' },
    { value: 'planned',   label: t('anime.tracking.planned'),   color: '#f4a261' },
    { value: 'dropped',   label: t('anime.tracking.dropped'),   color: '#e63946' },
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="anime-detail-page">

      {/* HERO */}
      <div className="anime-detail-hero">
        <div className="anime-detail-hero__background">
          <img src={anime.image} alt={anime.title} />
          <div className="anime-detail-hero__overlay" />
        </div>

        <div className="anime-detail-hero__content">
          <div className="anime-detail-hero__poster">
            <img src={anime.image} alt={anime.title} />
          </div>

          <div className="anime-detail-hero__info">
            <div className="anime-detail-hero__badges">
              <span className="badge badge--type">{anime.type}</span>
              <span className="badge badge--status">{anime.status}</span>
              <span className="badge badge--rating">
                <Star size={14} fill="#e63946" stroke="#e63946" />{anime.rating}
              </span>
              {/* Puntuación del usuario visible siempre que esté puntuado */}
              {isLoggedIn && isInLists && userScore > 0 && (
                <span className="badge badge--user-score">
                  <Star size={14} fill="#f4a261" stroke="#f4a261" />
                  {t('anime.my_score')}: {userScore}
                </span>
              )}
            </div>

            <h1 className="anime-detail-hero__title">{anime.title}</h1>

            <div className="anime-detail-hero__meta">
              <span><Calendar size={16} />{anime.year}</span>
              <span><Clock size={16} />{anime.episodes} {t('anime.episodes').toLowerCase()}</span>
            </div>

            <div className="anime-detail-hero__genres">
              {anime.genres.map(g => <span key={g} className="genre-pill">{g}</span>)}
            </div>

            {/* ── BOTONES PRINCIPALES ── */}
            <div className="anime-detail-hero__actions">

              {/* Añadir a lista */}
              <div className="btn-group">
                <button
                  className={`btn btn--secondary ${isInLists ? 'active' : ''}`}
                  onClick={() => !isLoggedIn ? setShowLoginModal(true) : setShowListSelector(!showListSelector)}
                >
                  {isInLists
                    ? <><Check size={20} />{t('anime.in_list')}</>
                    : <><Plus size={20} />{t('anime.add_to_list')}</>
                  }
                </button>

                {showListSelector && isLoggedIn && (
                  <div className="list-selector">
                    {userLists
                      .filter(l => l.name !== 'Me gusta')
                      .map(list => (
                        <label
                          key={list.id}
                          className={`list-checkbox-item ${togglingList === list.id ? 'loading' : ''}`}
                          style={{ borderLeft: `3px solid ${list.color}` }}
                        >
                          <input
                            type="checkbox"
                            checked={animeInListIds.includes(list.id)}
                            disabled={togglingList === list.id}
                            onChange={() => handleToggleList(list.id)}
                          />
                          <span className="list-checkbox-item__name">{list.name}</span>
                          <span className="list-checkbox-item__count">{list.anime_count}</span>
                        </label>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Me gusta */}
              <button
                className={`btn btn--icon ${isLiked ? 'btn--liked' : ''}`}
                onClick={handleLike}
                disabled={likingAnime}
                title={isLiked ? t('anime.unlike') : t('anime.like')}
              >
                <Heart size={20} fill={isLiked ? '#ec4899' : 'none'} stroke={isLiked ? '#ec4899' : 'currentColor'} />
              </button>

              {/* Compartir */}
              <div style={{ position: 'relative' }}>
                <button className="btn btn--icon" onClick={handleShare} title={t('common.share')}>
                  <Share2 size={20} />
                </button>
                {copied && <div className="copied-tooltip">{t('anime.link_copied')}</div>}
              </div>
            </div>

            {/* ── PANEL DE SEGUIMIENTO ── */}
            {isLoggedIn && isInLists && (
              <div className="tracking-panel">
                <div className="tracking-panel__header">
                  <BookOpen size={16} />
                  <span>{t('anime.tracking.title')}</span>
                </div>

                {/* Botones de estado */}
                <div className="tracking-status-row">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`status-btn ${currentStatus === opt.value ? 'active' : ''}`}
                      style={{ '--status-color': opt.color } as any}
                      onClick={() => {
                        setCurrentStatus(opt.value);
                        if (opt.value === 'completed') setEpisodesWatched(anime.episodes || 0);
                        if (opt.value === 'planned') setEpisodesWatched(0);
                        setTrackingDirty(true);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Input de episodios */}
                {showEpisodesInput && (
                  <div className="tracking-episodes-row">
                    <label className="tracking-episodes-label">
                      <Clock size={14} />
                      {t('anime.tracking.episodes_watched')}
                    </label>
                    <div className="tracking-episodes-input">
                      <button className="ep-btn" onClick={() => { setEpisodesWatched(Math.max(0, episodesWatched - 1)); setTrackingDirty(true); }}>−</button>
                      <input
                        type="number"
                        min={0}
                        max={anime.episodes || 9999}
                        value={episodesWatched}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(anime.episodes || 9999, parseInt(e.target.value) || 0));
                          setEpisodesWatched(v);
                          setTrackingDirty(true);
                        }}
                      />
                      <span className="ep-total">/ {anime.episodes || '?'}</span>
                      <button className="ep-btn" onClick={() => { setEpisodesWatched(Math.min(anime.episodes || 9999, episodesWatched + 1)); setTrackingDirty(true); }}>+</button>
                    </div>
                  </div>
                )}

                {/* Info episodios fijos */}
                {!showEpisodesInput && currentStatus && (
                  <div className="tracking-episodes-info">
                    <Clock size={14} />
                    <span>
                      {currentStatus === 'completed'
                        ? `${anime.episodes || 0} / ${anime.episodes || 0} ${t('anime.episodes').toLowerCase()}`
                        : `0 / ${anime.episodes || 0} ${t('anime.episodes').toLowerCase()}`}
                    </span>
                  </div>
                )}

                {/* ── PUNTUACIÓN ── */}
                <div className="tracking-score-row">
                  <label className="tracking-episodes-label">
                    <Star size={14} />
                    {t('anime.tracking.my_score')}
                  </label>
                  <div className="tracking-score-stars">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button
                        key={n}
                        className="score-star-btn"
                        onMouseEnter={() => setHoveredScore(n)}
                        onMouseLeave={() => setHoveredScore(0)}
                        onClick={() => {
                          // Si clica la misma nota, la quita (toggle)
                          const newScore = userScore === n ? 0 : n;
                          setUserScore(newScore);
                          setTrackingDirty(true);
                        }}
                        title={`${n}/10`}
                      >
                        <Star
                          size={18}
                          fill={n <= displayScore ? '#f4a261' : 'none'}
                          stroke={n <= displayScore ? '#f4a261' : 'rgba(255,255,255,0.3)'}
                        />
                      </button>
                    ))}
                    <span className="score-value">
                      {displayScore > 0 ? `${displayScore}/10` : '—'}
                    </span>
                  </div>
                </div>

                {/* Botón guardar */}
                {trackingDirty && (
                  <button
                    className="tracking-save-btn"
                    onClick={handleSaveTracking}
                    disabled={savingTracking}
                  >
                    {savingTracking ? t('anime.tracking.saving') : t('anime.tracking.save')}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="anime-detail-content">
        <section className="anime-detail-section">
          <h2 className="section-title">{t('anime.synopsis')}</h2>
          <p className="anime-detail-synopsis">{anime.synopsis}</p>
        </section>

        <section className="anime-detail-section">
          <h2 className="section-title">{t('anime.information')}</h2>
          <div className="anime-detail-info-grid">
            <div className="info-item"><span className="info-label">{t('anime.type')}</span><span className="info-value">{anime.type}</span></div>
            <div className="info-item"><span className="info-label">{t('anime.status')}</span><span className="info-value">{anime.status}</span></div>
            <div className="info-item"><span className="info-label">{t('anime.year')}</span><span className="info-value">{anime.year}</span></div>
            <div className="info-item"><span className="info-label">{t('anime.episodes')}</span><span className="info-value">{anime.episodes}</span></div>
            <div className="info-item"><span className="info-label">{t('anime.rating')}</span><span className="info-value">{anime.rating} ⭐</span></div>
            <div className="info-item"><span className="info-label">{t('anime.popularity')}</span><span className="info-value">#{anime.popularity}</span></div>
          </div>
        </section>

        <section className="anime-detail-section">
          <h2 className="section-title">{t('anime.genres')}</h2>
          <div className="anime-detail-genres">
            {anime.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
          </div>
        </section>

        {anime.studios?.length > 0 && (
          <section className="anime-detail-section">
            <h2 className="section-title">{t('anime.studios')}</h2>
            <div className="anime-detail-studios">
              {anime.studios.map(s => <span key={s} className="studio-tag">{s}</span>)}
            </div>
          </section>
        )}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title={t('anime.login_modal_title')}
        subtitle={t('anime.login_modal_subtitle')}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}