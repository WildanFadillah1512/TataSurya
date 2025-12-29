import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    // --- HALAMAN MENU PILIHAN ---
    {
      path: '/selection',
      name: 'selection',
      component: () => import('../views/SelectionView.vue')
    },
    // --- FITUR UTAMA ---
    {
      path: '/explore',
      name: 'explore',
      component: () => import('../views/ExploreView.vue')
    },
    {
      path: '/events',
      name: 'events',
      component: () => import('../views/EventsView.vue')
    },
    
    // =======================================================
    // BAGIAN GAMES (Disesuaikan dengan folder src/views/games)
    // =======================================================
    
    {
      path: '/game',
      name: 'game-lobby', // Halaman Menu Utama Game
      // Mengarah ke folder 'games' dan file 'GameLobby.vue'
      component: () => import('../views/games/GameLobby.vue')
    },
    {
      path: '/game/play-1',
      name: 'game-1', // Game Tebak Planet
      component: () => import('../views/games/Game1View.vue')
    },
    {
      path: '/game/play-2',
      name: 'game-2', // Game Quiz
      component: () => import('../views/games/Game2View.vue')
    },

    // =======================================================

    // --- HALAMAN QUIZ (UMUM) ---
    {
      path: '/quiz/:id',
      name: 'quiz',
      component: () => import('../views/QuizView.vue')
    },
    // --- DETAIL PLANET ---
    {
      path: '/planet/:id',
      name: 'planet-detail',
      component: () => import('../views/PlanetDetail.vue'),
      props: true
    }
  ]
})

export default router