// src/lib/recommendations.ts
import { supabase } from './supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
export interface Anime {
  id: number;
  title: string;
  image: string;
  genres: string[];
  rating: number;
  popularity?: number; 
  year: number;
  episodes?: number;
  status?: string;       
  synopsis?: string;      
  description?: string;   
}

export interface UserPreferences {
  favoriteGenres: string[];
  watchedAnime: number[];
  favoriteAnime: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITMO PRINCIPAL DE RECOMENDACIÓN
// ─────────────────────────────────────────────────────────────────────────────
export async function getRecommendations(userId?: string, limit: number = 10) {
  if (!userId) {
    // Si no hay usuario logueado, devolver populares
    return getPopularRecommendations(limit);
  }

  try {
    // 1️⃣ Obtener preferencias del usuario
    const preferences = await getUserPreferences(userId);
    
    // 2️⃣ Si tiene preferencias, recomendar basado en gustos
    if (preferences.favoriteGenres.length > 0 || preferences.favoriteAnime.length > 0) {
      const personalized = await getPersonalizedRecommendations(preferences, limit);
      if (personalized.length > 0) {
        return personalized;
      }
    }

    // 3️⃣ Fallback: recomendaciones populares
    return getPopularRecommendations(limit);
    
  } catch (error) {
    console.error('Error en recomendaciones:', error);
    return getPopularRecommendations(limit);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1️⃣ OBTENER PREFERENCIAS DEL USUARIO
// ─────────────────────────────────────────────────────────────────────────────
async function getUserPreferences(userId: string): Promise<UserPreferences> {
  // Obtener listas del usuario de Supabase
  const { data: lists, error } = await supabase
    .from('user_anime_lists')
    .select('anime_id, status, score')
    .eq('user_id', userId);

  if (error || !lists) {
    return {
      favoriteGenres: [],
      watchedAnime: [],
      favoriteAnime: [],
    };
  }

  // Analizar preferencias
  const favoriteAnime = lists
    .filter(item => item.status === 'favorites' || (item.score && item.score >= 8))
    .map(item => item.anime_id);

  const watchedAnime = lists.map(item => item.anime_id);

  // Obtener géneros de los animes favoritos
  const genreCount: Record<string, number> = {};
  
  // Aquí necesitarías obtener los géneros de cada anime favorito
  // Por ahora, simulamos con datos de ejemplo
  const favoriteGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);

  return {
    favoriteGenres,
    watchedAnime,
    favoriteAnime,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2️⃣ RECOMENDACIONES PERSONALIZADAS (basado en gustos)
// ─────────────────────────────────────────────────────────────────────────────
async function getPersonalizedRecommendations(
  preferences: UserPreferences,
  limit: number
): Promise<Anime[]> {
  // Obtener todos los animes (de tu data/animes.json o DB)
  const allAnime = await getAllAnime();

  // Filtrar animes que ya ha visto
  const unseenAnime = allAnime.filter(
    anime => !preferences.watchedAnime.includes(anime.id)
  );

  // Calcular score de recomendación para cada anime
  const scoredAnime = unseenAnime.map(anime => ({
    ...anime,
    score: calculateRecommendationScore(anime, preferences),
  }));

  // Ordenar por score y devolver top N
  return scoredAnime
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...anime }) => anime);
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR SCORE DE RECOMENDACIÓN
// ─────────────────────────────────────────────────────────────────────────────
function calculateRecommendationScore(
  anime: Anime,
  preferences: UserPreferences
): number {
  let score = 0;

  // +30 puntos por cada género favorito
  const matchingGenres = anime.genres.filter(genre =>
    preferences.favoriteGenres.includes(genre)
  );
  score += matchingGenres.length * 30;

  // +20 puntos si tiene alta rating
  if (anime.rating >= 8.5) score += 20;
  else if (anime.rating >= 7.5) score += 10;

  // +15 puntos si es popular
  if (anime.popularity && anime.popularity > 1000) score += 15;

  // +10 puntos si es reciente (últimos 2 años)
  if (anime.year >= new Date().getFullYear() - 2) score += 10;

  // +5 puntos por cada anime favorito del mismo género
  // (esto requeriría más análisis)

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3️⃣ RECOMENDACIONES POPULARES (fallback)
// ─────────────────────────────────────────────────────────────────────────────
async function getPopularRecommendations(limit: number): Promise<Anime[]> {
  const allAnime = await getAllAnime();

  return allAnime
    .sort((a, b) => {
      // Ordenar por: rating + popularidad
      const scoreA = (a.rating || 0) + (a.popularity || 0) / 100;
      const scoreB = (b.rating || 0) + (b.popularity || 0) / 100;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Obtener todos los animes
// ─────────────────────────────────────────────────────────────────────────────
async function getAllAnime(): Promise<Anime[]> {
  // Opción 1: Desde tu data/animes.json
  // const response = await fetch('/data/animes.json');
  // return response.json();

  // Opción 2: Desde Supabase 
  const { data, error } = await supabase
    .from('animes_rows') // <--- CAMBIA 'animes' POR 'animes_rows' AQUÍ
    .select('*');

  if (error) {
    console.error('Error al obtener animes:', error);
    return [];
  }

  return data || [];
}