// src/pages/Lists/Lists.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import LoginModal from '../../components/common/LoginModal';
import {
  Plus, Folder, Heart, Clock, CheckCircle, Play,
  Trash2, Edit2, X, ChevronRight, Grid, List as ListIcon, Search
} from 'lucide-react';
import './Lists.css';

interface UserList {
  id: string;
  name: string;
  type: 'system' | 'custom';
  color: string;
  icon: string;
  anime_count: number;
  description?: string;
  is_public: boolean;
}

interface ListAnime {
  anime_id: number;
  title: string;
  image: string;
  status: string;
  score: number;
  episodes_watched: number;
  total_episodes: number;
  added_at: string;
}

export default function Lists() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [selectedList, setSelectedList] = useState<UserList | null>(null);
  const [listAnimes, setListAnimes] = useState<ListAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const [showListModal, setShowListModal] = useState(false);
  const [editingList, setEditingList] = useState<UserList | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalColor, setModalColor] = useState('#e63946');
  const [modalDescription, setModalDescription] = useState('');
  const [savingList, setSavingList] = useState(false);

  // ── EFECTO 1: Auth ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setIsLoggedIn(!!session);
        setUserId(session?.user?.id || null);
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) {
        setIsLoggedIn(!!session);
        setUserId(session?.user?.id || null);
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── EFECTO 2: Cargar listas ──────────────────────────────────────────────
  useEffect(() => {
    if (isLoggedIn && userId) {
      console.log('🔄 Cargando listas para usuario:', userId);
      fetchUserLists();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, userId]);

  // ── EFECTO 3: Cargar animes de la lista seleccionada ─────────────────────
  useEffect(() => {
    if (selectedList && userId) {
      console.log('📂 Cargando animes de la lista:', selectedList.name);
      fetchListAnimes(selectedList.id);
    }
  }, [selectedList]);

  // ── FUNCIÓN: Obtener listas ─────────────────────────────────────────────
  const fetchUserLists = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      console.log('🔄 Cargando listas para usuario:', userId);
      
      // 1. Obtener todas las listas del usuario
      const { data: lists, error } = await supabase
        .from('user_lists_rows')
        .select('*')
        .eq('user_id', userId)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error al cargar listas:', error);
        throw error;
      }
      
      console.log('✅ Listas base cargadas:', lists?.length || 0);
      
      // 2. Para cada lista, contar cuántos animes tiene
      const listsWithCount = await Promise.all(
        (lists || []).map(async (list: any) => {
          const { count, error: countError } = await supabase
            .from('user_list_animes_rows')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);

          if (countError) {
            console.error('Error al contar animes para lista', list.name, countError);
            return { 
              ...list, 
              anime_count: 0 
            };
          }

          return {
            ...list,
            anime_count: count || 0,
          };
        })
      );

      console.log('✅ Listas con contadores:', listsWithCount);
      
      // 3. Reemplazar completamente el estado (no concatenar)
      setUserLists(listsWithCount);
      
    } catch (err: any) {
      console.error('Error en fetchUserLists:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── FUNCIÓN: Obtener animes de una lista ─────────────────────────────────
  const fetchListAnimes = async (listId: string) => {
    try {
      console.log(' Cargando animes de la lista:', listId);
      
      // 1. Obtener los registros de la lista (sin relación)
      const { data: listData, error: listError } = await supabase
        .from('user_list_animes_rows')
        .select('anime_id, status, score, episodes_watched, added_at')
        .eq('list_id', listId)
        .order('added_at', { ascending: false });

      if (listError) {
        console.error('❌ Error al cargar registros:', listError);
        throw listError;
      }

      console.log('📋 Registros obtenidos:', listData?.length || 0);

      if (!listData || listData.length === 0) {
        setListAnimes([]);
        if (selectedList) {
          setSelectedList(prev => prev ? { ...prev, anime_count: 0 } : null);
        }
        return;
      }

      // 2. Obtener los IDs de los animes
      const animeIds = listData.map(item => item.anime_id);

      // 3. Obtener los datos de los animes en una consulta separada
      const { data: animeData, error: animeError } = await supabase
        .from('animes_rows')
        .select('id, title, image, episodes')
        .in('id', animeIds);

      if (animeError) {
        console.error('❌ Error al cargar animes:', animeError);
        throw animeError;
      }

      console.log(' Animes obtenidos:', animeData?.length || 0);

      // 4. Combinar los datos
      const animeMap = new Map((animeData || []).map(a => [a.id, a]));

      const mappedAnimes = listData.map(item => {
        const anime = animeMap.get(item.anime_id);
        return {
          anime_id: item.anime_id,
          title: anime?.title || 'Desconocido',
          image: anime?.image || '',
          status: item.status,
          score: item.score,
          episodes_watched: item.episodes_watched,
          total_episodes: anime?.episodes || 0,
          added_at: item.added_at,
        };
      });

      setListAnimes(mappedAnimes);

      // Actualizar contador
      if (selectedList) {
        setSelectedList(prev => prev ? {
          ...prev,
          anime_count: mappedAnimes.length
        } : null);
      }

    } catch (err: any) {
      console.error('❌ Error en fetchListAnimes:', err);
    }
  };

  // ── FUNCIÓN: Crear/Editar lista ──────────────────────────────────────────
  const openCreateModal = () => {
    setEditingList(null);
    setModalName('');
    setModalColor('#e63946');
    setModalDescription('');
    setShowListModal(true);
  };

  const openEditModal = (list: UserList, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingList(list);
    setModalName(list.name);
    setModalColor(list.color);
    setModalDescription(list.description || '');
    setShowListModal(true);
  };

  const handleSaveList = async () => {
    if (!modalName.trim() || !userId) return;
    try {
      setSavingList(true);
      
      if (editingList) {
        // Actualizar lista existente
        const { error } = await supabase
          .from('user_lists_rows')
          .update({ 
            name: modalName.trim(), 
            color: modalColor, 
            description: modalDescription.trim() || null 
          })
          .eq('id', editingList.id)
          .eq('type', 'custom');
          
        if (error) throw error;
      } else {
        // 🚨 Crear nueva lista con ID generado
        const newListId = crypto.randomUUID();
        
        const { error } = await supabase.from('user_lists_rows').insert({
          id: newListId,  // <--- SIEMPRE pasar el ID
          user_id: userId,
          name: modalName.trim(),
          type: 'custom',
          color: modalColor,
          description: modalDescription.trim() || null,
          is_public: false,
          icon: 'folder'
        });
        
        if (error) throw error;
      }
      
      setShowListModal(false);
      await fetchUserLists();
      
    } catch (err: any) {
      console.error('Error al guardar lista:', err);
      alert('Error: ' + err.message);
    } finally {
      setSavingList(false);
    }
  };

  // ── FUNCIÓN: Eliminar lista (CORREGIDA) ──────────────────────────────────
  const handleDeleteList = async (listId: string) => {
    console.log('🗑️ ========== INICIANDO ELIMINACIÓN ==========');
    console.log('️ ID de lista a eliminar:', listId);
    
    try {
      // 1. Verificar que exista y no sea del sistema
      const listToDelete = userLists.find(l => l.id === listId);
      console.log(' Lista encontrada:', listToDelete);
      
      if (!listToDelete) {
        alert('Lista no encontrada');
        setShowDeleteConfirm(null);
        return;
      }
      
      if (listToDelete.type === 'system') {
        alert('No se pueden eliminar listas del sistema');
        setShowDeleteConfirm(null);
        return;
      }

      // 2. Borrar todos los animes de esa lista
      console.log(' Paso 1: Borrando animes de la lista...');
      const { data: deleteAnimesData, error: animesError } = await supabase
        .from('user_list_animes_rows')
        .delete()
        .eq('list_id', listId)
        .select();

      if (animesError) {
        console.error('❌ Error al borrar animes:', animesError);
        throw animesError;
      }
      console.log('✅ Animes borrados:', deleteAnimesData);

      // 3. Borrar la lista
      console.log('📋 Paso 2: Borrando la lista...');
      const { data: deleteListData, error: listError } = await supabase
        .from('user_lists_rows')
        .delete()
        .eq('id', listId)
        .eq('type', 'custom')
        .select();

      if (listError) {
        console.error('❌ Error al borrar lista:', listError);
        throw listError;
      }
      console.log('✅ Lista eliminada:', deleteListData);

      // 4. Actualizar estado
      console.log('📋 Actualizando estado...');
      setShowDeleteConfirm(null);
      
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setListAnimes([]);
      }

      // 5. Recargar listas
      console.log(' Recargando listas...');
      await fetchUserLists();
      console.log('✅ Listas recargadas');
      console.log('🗑️ ========== ELIMINACIÓN COMPLETADA ==========');

    } catch (err: any) {
      console.error('❌ ERROR COMPLETO EN handleDeleteList:', err);
      console.error('❌ Mensaje:', err.message);
      console.error('❌ Stack:', err.stack);
      alert('Error al eliminar: ' + err.message);
    }
  };

  // ── FUNCIÓN: Eliminar anime de lista ─────────────────────────────────────
  const handleRemoveAnime = async (animeId: number) => {
    if (!selectedList) return;
    try {
      const { error } = await supabase
        .from('user_list_animes_rows')
        .delete()
        .eq('list_id', selectedList.id)
        .eq('anime_id', animeId);
        
      if (error) throw error;
      
      await fetchListAnimes(selectedList.id);
      await fetchUserLists();
      
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    fetchUserLists();
  };

  const getListIcon = (iconName: string) => ({
    'play': <Play size={20} />,
    'check-circle': <CheckCircle size={20} />,
    'clock': <Clock size={20} />,
    'heart': <Heart size={20} />,
    'folder': <Folder size={20} />,
  }[iconName] || <Folder size={20} />);

  const getStatusColor = (status: string) => ({
    'watching': '#3b82f6',
    'completed': '#2a9d8f',
    'planned': '#f4a261',
    'dropped': '#e63946',
  }[status] || '#6c757d');

  const statusLabel = (status: string) => ({
    watching: t('lists.status_watching'),
    completed: t('lists.status_completed'),
    planned: t('lists.status_planned'),
    dropped: t('lists.status_dropped'),
  }[status] || status);

  // ── RENDER: No logueado ──────────────────────────────────────────────────
  if (!isLoggedIn) return (
    <div className="lists-page">
      <div className="lists-empty">
        <div className="lists-empty__icon"><Folder size={64} /></div>
        <h2>{t('lists.login_title')}</h2>
        <p>{t('lists.login_sub')}</p>
        <button className="btn btn--primary" onClick={() => setShowLoginModal(true)}>
          {t('lists.login_btn')}
        </button>
      </div>
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        title={t('lists.title')} 
        subtitle={t('lists.create_subtitle')}
        onLoginSuccess={handleLoginSuccess} 
      />
    </div>
  );

  // ── RENDER: Cargando ─────────────────────────────────────────────────────
  if (loading && !selectedList) return (
    <div className="lists-page">
      <div className="lists-loading">
        <div className="loading-spinner" />
        <p>{t('lists.loading')}</p>
      </div>
    </div>
  );

  // ── RENDER: Detalle de lista ────────────────────────────────────────────
  if (selectedList) {
    return (
      <div className="lists-page">
        <div className="list-detail">
          <div className="list-detail__header">
            <button className="btn btn--back" onClick={() => { 
              setSelectedList(null); 
              setListAnimes([]); 
            }}>
              {t('lists.back')}
            </button>
            <div className="list-detail__info">
              <div className="list-detail__icon" style={{ 
                backgroundColor: selectedList.color + '20', 
                color: selectedList.color 
              }}>
                {getListIcon(selectedList.icon)}
              </div>
              <div>
                <h2>{selectedList.name}</h2>
                {selectedList.description && (
                  <p className="list-detail__description">{selectedList.description}</p>
                )}
              </div>
            </div>
              <div className="list-detail__actions">
              {selectedList.type === 'custom' && (
                <>
                  <button 
                    className="btn btn--icon" 
                    onClick={e => {
                      e.stopPropagation();
                      openEditModal(selectedList, e);
                    }}
                    title={t('lists.edit_list_title')}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    className="btn btn--icon btn--danger" 
                    onClick={() => {
                      console.log('🗑️ Click en eliminar, ID:', selectedList.id);
                      setShowDeleteConfirm(selectedList.id);
                    }}
                    title={t('lists.delete_list_warning')}
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="list-detail__search">
            <Search size={18} />
            <input 
              type="text" 
              placeholder={t('lists.search_placeholder')} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} 
              className="search-input" 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="search-clear">
                <X size={16} />
              </button>
            )}
          </div>

          <div className={`list-animes ${viewMode}`}>
            {listAnimes
              .filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(anime => (
                <div key={anime.anime_id} className="list-anime-card">
                  <div 
                    className="list-anime-card__image" 
                    onClick={() => navigate(`/anime/${anime.anime_id}`)}
                  >
                    <img src={anime.image} alt={anime.title} />
                    {anime.score > 0 && (
                      <div className="list-anime-card__score">{anime.score}/10</div>
                    )}
                  </div>
                  <div className="list-anime-card__content">
                    <h4 
                      className="list-anime-card__title" 
                      onClick={() => navigate(`/anime/${anime.anime_id}`)}
                    >
                      {anime.title}
                    </h4>
                    {anime.total_episodes > 0 && (
                      <div className="list-anime-card__progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${Math.min(100, (anime.episodes_watched / anime.total_episodes) * 100)}%`, 
                              backgroundColor: getStatusColor(anime.status) 
                            }} 
                          />
                        </div>
                        <span className="progress-text">
                          {anime.episodes_watched}/{anime.total_episodes} {t('common.episodes_short')}
                        </span>
                      </div>
                    )}
                    {anime.status && (
                      <span 
                        className="status-badge" 
                        style={{ 
                          backgroundColor: getStatusColor(anime.status) + '20', 
                          color: getStatusColor(anime.status) 
                        }}
                      >
                        {statusLabel(anime.status)}
                      </span>
                    )}
                  </div>
                  <button 
                    className="list-anime-card__remove" 
                    onClick={() => handleRemoveAnime(anime.anime_id)}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            {listAnimes.length === 0 && (
              <div className="list-empty">
                <p>{t('lists.empty')}</p>
                <button onClick={() => navigate('/catalogo')}>{t('lists.explore')}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Grid de listas ───────────────────────────────────────────────
  return (
    <div className="lists-page">
      {/* HEADER */}
      <div className="lists-header">
        <div className="lists-header__title">
          <h1>{t('lists.title')}</h1>
          <p>
            {userLists.length} {t('lists.animes_bullet')} •{' '}
            {userLists.reduce((acc, l) => acc + l.anime_count, 0)} animes
          </p>
        </div>
        <div className="lists-header__actions">
          <div className="view-toggle">
            <button 
              className={viewMode === 'grid' ? 'active' : ''} 
              onClick={() => setViewMode('grid')}
            >
              <Grid size={20} />
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
            >
              <ListIcon size={20} />
            </button>
          </div>
          <button className="btn btn--primary" onClick={openCreateModal}>
            <Plus size={20} />{t('lists.new_list')}
          </button>
        </div>
      </div>

      {/* GRID DE LISTAS */}
      <div className={`lists-grid ${viewMode}`}>
        {userLists.map(list => (
          <div 
            key={list.id} 
            className={`list-card ${viewMode}`} 
            onClick={() => setSelectedList(list)}
          >
            <div 
              className="list-card__icon" 
              style={{ 
                backgroundColor: list.color + '20', 
                borderColor: list.color + '40', 
                color: list.color 
              }}
            >
              {getListIcon(list.icon)}
            </div>
            <div className="list-card__content">
              <div className="list-card__header">
                <h3>{list.name}</h3>
                {list.type === 'system' && (
                  <span className="list-card__badge">{t('lists.system')}</span>
                )}
                {list.type === 'custom' && (
                  <button 
                    className="list-card__edit-btn" 
                    onClick={e => openEditModal(list, e)}
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
              {list.description && viewMode === 'list' && (
                <p className="list-card__description">{list.description}</p>
              )}
              <div className="list-card__meta">
                <span>{list.anime_count} {t('lists.animes_bullet')}</span>
                <ChevronRight size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CREAR / EDITAR */}
      {showListModal && (
        <div className="modal-overlay" onClick={() => setShowListModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowListModal(false)}>
              <X size={24} />
            </button>
            <h2>{editingList ? t('lists.edit_list') : t('lists.create_list')}</h2>
            <p className="modal-subtitle">
              {editingList ? t('lists.edit_subtitle') : t('lists.create_subtitle')}
            </p>
            <div className="form-group">
              <label>{t('lists.list_name')} *</label>
              <input 
                type="text" 
                value={modalName} 
                onChange={e => setModalName(e.target.value)}
                placeholder={t('lists.list_name_placeholder')} 
                maxLength={50} 
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveList()} 
              />
            </div>
            <div className="form-group">
              <label>{t('lists.color')}</label>
              <div className="color-picker">
                {['#e63946', '#2a9d8f', '#f4a261', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => (
                  <button 
                    key={color} 
                    className={`color-option ${modalColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }} 
                    onClick={() => setModalColor(color)} 
                  />
                ))}
              </div>
              <div className="color-preview" style={{ borderColor: modalColor, color: modalColor }}>
                <Folder size={16} />
                <span>{modalName || t('lists.color_preview')}</span>
              </div>
            </div>
            <div className="form-group">
              <label>{t('lists.description')}</label>
              <textarea 
                value={modalDescription} 
                onChange={e => setModalDescription(e.target.value)}
                placeholder={t('lists.description_placeholder')} 
                maxLength={200} 
                rows={3} 
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn--secondary" 
                onClick={() => setShowListModal(false)}
              >
                {t('lists.cancel')}
              </button>
              <button 
                className="btn btn--primary" 
                onClick={handleSaveList} 
                disabled={!modalName.trim() || savingList}
              >
                {savingList
                  ? (editingList ? t('lists.saving') : t('lists.creating'))
                  : (editingList ? t('lists.save_changes') : t('lists.create'))
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
        MODAL DE CONFIRMACIÓN DE ELIMINAR
        ============================================ */}
      {showDeleteConfirm && (
        <div 
          className="modal-overlay" 
          onClick={() => {
            console.log('🔴 Click fuera del modal, cerrando...');
            setShowDeleteConfirm(null);
          }}
        >
          <div 
            className="modal-content modal--danger" 
            onClick={e => {
              console.log(' Click dentro del modal, no cerrar');
              e.stopPropagation();
            }}
          >
            <h2>{t('lists.delete_list')}</h2>
            <p>{t('lists.delete_warning')}</p>
            <p style={{color: '#666', fontSize: '12px', marginTop: '10px'}}>
              ID: {showDeleteConfirm}
            </p>
            <div className="modal-actions">
              <button 
                className="btn btn--secondary" 
                onClick={() => {
                  console.log('❌ Cancelar eliminación');
                  setShowDeleteConfirm(null);
                }}
              >
                {t('lists.cancel')}
              </button>
              <button 
                className="btn btn--danger" 
                onClick={() => {
                  console.log('✅ CONFIRMANDO ELIMINACIÓN DE:', showDeleteConfirm);
                  handleDeleteList(showDeleteConfirm);
                }}
              >
                {t('lists.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        title={t('lists.title')} 
        subtitle={t('lists.create_subtitle')}
        onLoginSuccess={handleLoginSuccess} 
      />
    </div>
  );
}