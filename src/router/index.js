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
      // Ini adalah halaman menu utama setelah Home
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
      // Lazy load view EventsView
      component: () => import('../views/EventsView.vue')
    },
    {
      path: '/game',
      name: 'game',
      // Lazy load view GameView
      component: () => import('../views/GameView.vue')
    },
    // --- HALAMAN QUIZ (BARU) ---
    {
      path: '/quiz/:id',
      name: 'quiz',
      // Menerima parameter :id (bisa angka untuk planet, atau string 'events')
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