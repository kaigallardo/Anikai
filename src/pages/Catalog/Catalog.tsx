// src/pages/Catalog/Catalog.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { Search, Filter, Star, Grid, List, ChevronDown, ChevronUp, X } from 'lucide-react';
import './Catalog.css';

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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function Catalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [filteredAnimes, setFilteredAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showGenres, setShowGenres] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // ───────────────────────────────────────────────────────────────────────────
  // EFECTOS
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => { fetchAnimes(); }, []);
  useEffect(() => { applyFilters(); }, [searchTerm, selectedGenres, selectedStatus, selectedType, sortBy, animes]);

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Obtener animes
  // ───────────────────────────────────────────────────────────────────────────
  const fetchAnimes = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('animes_rows') // <--- CAMBIA 'animes' POR 'animes_rows' AQUÍ
        .select('*')
        .order('popularity', { ascending: false });
      if (error) throw error;
      setAnimes(data || []);
      setFilteredAnimes(data || []);
    } catch (err: any) {
      console.error('Error al cargar animes:', err);
      setError(err.message || t('catalog.loading'));
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Aplicar filtros
  // ───────────────────────────────────────────────────────────────────────────
  const applyFilters = () => {
    let result = [...animes];
    if (searchTerm) result = result.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedType) result = result.filter(a => a.type === selectedType);
    if (selectedGenres.length > 0) result = result.filter(a => selectedGenres.every(g => a.genres.includes(g)));
    if (selectedStatus) result = result.filter(a => a.status === selectedStatus);
    switch (sortBy) {
      case 'popularity': result.sort((a, b) => b.popularity - a.popularity); break;
      case 'rating':     result.sort((a, b) => b.rating - a.rating); break;
      case 'year':       result.sort((a, b) => b.year - a.year); break;
      case 'title':      result.sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    setFilteredAnimes(result);
    setCurrentPage(1);
  };

  const getAllGenres = () => {
    const genres = new Set<string>();
    animes.forEach(a => a.genres.forEach(g => genres.add(g)));
    return Array.from(genres).sort();
  };

  const toggleGenre = (genre: string) =>
    setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGenres([]);
    setSelectedStatus('');
    setSelectedType('');
    setSortBy('popularity');
    setShowGenres(false);
  };

  const totalPages = Math.ceil(filteredAnimes.length / itemsPerPage);
  const currentAnimes = filteredAnimes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ───────────────────────────────────────────────────────────────────────────
  // RENDERS ESPECIALES
  // ───────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="catalog-page">
      <div className="catalog-loading">
        <div className="loading-spinner" />
        <p>{t('catalog.loading')}</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="catalog-page">
      <div className="catalog-error">
        <p>❌ {error}</p>
        <button onClick={fetchAnimes}>{t('common.back')}</button>
      </div>
    </div>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="catalog-page">

      {/* HEADER */}
      <div className="catalog-header">
        <h1>{t('catalog.title')}</h1>
        <p>{filteredAnimes.length} {t('catalog.available')}</p>
      </div>

      {/* FILTROS */}
      <div className="catalog-filters">

        {/* Búsqueda */}
        <div className="search-container">
          <Search size={20} />
          <input
            type="text"
            placeholder={t('catalog.search_placeholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filtros principales */}
        <div className="filters-container">
          {/* Tipo */}
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="filter-select">
            <option value="">{t('catalog.all_types')}</option>
            <option value="Anime">{t('catalog.type_anime')}</option>
            <option value="Película">{t('catalog.type_movie')}</option>
          </select>

          {/* Estado */}
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="filter-select">
            <option value="">{t('catalog.all_status')}</option>
            <option value="En emisión">{t('catalog.status_airing')}</option>
            <option value="Finalizado">{t('catalog.status_finished')}</option>
            <option value="Próximamente">{t('catalog.status_upcoming')}</option>
          </select>

          {/* Ordenar */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
            <option value="popularity">{t('catalog.sort_popularity')}</option>
            <option value="rating">{t('catalog.sort_rating')}</option>
            <option value="year">{t('catalog.sort_year')}</option>
            <option value="title">{t('catalog.sort_title')}</option>
          </select>

          {/* Vista */}
          <div className="view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title={t('catalog.view_grid')}>
              <Grid size={20} />
            </button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title={t('catalog.view_list')}>
              <List size={20} />
            </button>
          </div>

          {/* Limpiar */}
          <button className="clear-filters" onClick={clearFilters}>
            <X size={16} />{t('catalog.clear_filters')}
          </button>
        </div>

        {/* Géneros colapsable */}
        <div className="genres-section">
          <button className="genres-toggle" onClick={() => setShowGenres(!showGenres)}>
            <Filter size={18} />
            <span>{t('catalog.genres')} ({selectedGenres.length})</span>
            {showGenres ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showGenres && (
            <div className="genres-list">
              {getAllGenres().map(genre => (
                <button
                  key={genre}
                  className={`genre-tag ${selectedGenres.includes(genre) ? 'active' : ''}`}
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                  {selectedGenres.includes(genre) && <span className="genre-remove">×</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GRID DE ANIMES */}
      <div className={`catalog-content ${viewMode}`}>
        {currentAnimes.length > 0 ? (
          currentAnimes.map(anime => (
            <div
              key={anime.id}
              className={`anime-card ${viewMode}`}
              onClick={() => navigate(`/anime/${anime.id}`)}
            >
              <div className="anime-card__image">
                <img src={anime.image} alt={anime.title} />
                <div className="anime-card__rating">
                  <Star size={14} fill="#e63946" stroke="#e63946" />
                  {anime.rating}
                </div>
                <div className="anime-card__type">{anime.type}</div>
                <div className="anime-card__status">{anime.status}</div>
              </div>
              <div className="anime-card__content">
                <h3 className="anime-card__title">{anime.title}</h3>
                <div className="anime-card__meta">
                  <span>{anime.year}</span>
                  <span>•</span>
                  <span>{anime.episodes} {t('common.episodes_short')}</span>
                </div>
                <div className="anime-card__genres">
                  {anime.genres.slice(0, 3).map(genre => (
                    <span key={genre} className="genre-pill">{genre}</span>
                  ))}
                </div>
                {viewMode === 'list' && (
                  <p className="anime-card__synopsis">{anime.synopsis}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>{t('catalog.no_results')}</p>
            <button onClick={clearFilters}>{t('catalog.clear_filters')}</button>
          </div>
        )}
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            ← {t('catalog.prev')}
          </button>
          <span className="pagination-info">
            {t('catalog.page')} {currentPage} {t('catalog.of')} {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            {t('catalog.next')} →
          </button>
        </div>
      )}
    </div>
  );
}