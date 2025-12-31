// src/stores/spaceStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { solarData } from '../data/planets.js'

export const useSpaceStore = defineStore('space', () => {

  // =========================================
  // BAGIAN 1: LOGIKA VISUAL & PLANET
  // =========================================

  // Status saat ini: 'intro', 'orbit', atau 'detail'
  const viewState = ref('intro')

  // Planet yang sedang dilihat
  const targetPlanet = ref(null)

  // Helper functions untuk transformasi data visual
  const getVisualDistance = (id) => {
    const distances = {
      0: 0,   // Sun
      1: 15,  // Mercury
      2: 22,  // Venus
      3: 32,  // Earth
      4: 42,  // Mars
      5: 60,  // Jupiter
      6: 80,  // Saturn
      7: 95,  // Uranus
      8: 110, // Neptune
      9: 32   // Moon (sama dengan Earth)
    }
    return distances[id] || 50
  }

  const getVisualScale = (id) => {
    const scales = {
      0: 6.0,  // Sun
      1: 0.8,  // Mercury
      2: 1.5,  // Venus
      3: 1.6,  // Earth
      4: 1.2,  // Mars
      5: 4.5,  // Jupiter
      6: 3.8,  // Saturn
      7: 2.5,  // Uranus
      8: 2.4,  // Neptune
      9: 0.4   // Moon
    }
    return scales[id] || 1.0
  }

  // Data Planet (Computed dari solarData)
  // Exclude Matahari (id=0) dan Bulan (id=9) untuk orbit view
  const planets = computed(() =>
    solarData
      .filter(p => p.id !== 0 && p.id !== 9)
      .map(p => ({
        name: p.name,
        color: p.color,
        dist: getVisualDistance(p.id),
        scale: getVisualScale(p.id)
      }))
  )

  // Action: Ganti Fokus Planet
  function setFocus(planetName) {
    targetPlanet.value = planetName
    viewState.value = planetName ? 'detail' : 'orbit'
  }

  // =========================================
  // BAGIAN 2: LOGIKA LEADERBOARD & API
  // =========================================

  const leaderboardData = ref([])
  const isLoading = ref(false)

  // Link API SheetDB kamu
  const API_URL = 'https://sheetdb.io/api/v1/rgybqeb3jkigw'

  // Action: Ambil Data Leaderboard
  async function fetchLeaderboard() {
    isLoading.value = true
    try {
      const response = await fetch(API_URL)
      const data = await response.json()

      // Proses data dari Google Sheet
      leaderboardData.value = data
        .map(player => ({
          // Mapping data Sheet (Headers Kecil) ke Frontend - Handle variasi key
          name: player.nama || player.name || player.Name || 'Anonymous',
          score: parseInt(player.skor || player.score || player.Score || 0),
          type: player.tipe || player.type || player.Type || 'Unknown',
          date: player.tanggal || player.date || player.Date || '-'
        }))
        // Filter data yang tidak valid
        .filter(player => player.name && !isNaN(player.score))
        .sort((a, b) => b.score - a.score) // Urutkan score tertinggi
      // .slice(0, 10) // <-- HAPUS LIMIT DATA SUPAYA BISA DI-FILTER DI VIEW


    } catch (error) {
      console.error('Gagal mengambil leaderboard:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Action: Kirim Skor Baru (+ Tipe Quiz)
  async function submitScore(playerName, playerScore, quizType) {
    isLoading.value = true;
    try {
      // 1. Buat Tanggal Otomatis (Format: DD/MM/YYYY, HH:mm)
      const now = new Date();
      const formattedDate = now.toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // 2. Siapkan Data (Key harus SAMA PERSIS dengan Header Google Sheet)
      // Header Sheet: nama | skor | tipe | tanggal
      const payload = {
        data: {
          "name": playerName,
          "score": playerScore,
          "type": quizType,       // <-- Dikirim dari QuizView
          "date": formattedDate
        }
      }

      // 3. Kirim ke SheetDB
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error("Gagal mengirim ke SheetDB");

      // 4. Refresh data leaderboard agar update
      await fetchLeaderboard()
      return true // Berhasil

    } catch (error) {
      console.error('Gagal kirim skor:', error)
      return false // Gagal
    } finally {
      isLoading.value = false;
    }
  }

  // =========================================
  // EXPORT SEMUA
  // =========================================
  return {
    // State & Action Visual
    viewState,
    targetPlanet,
    planets,
    setFocus,

    // State & Action Leaderboard
    leaderboardData,
    isLoading,
    fetchLeaderboard,
    submitScore
  }
})