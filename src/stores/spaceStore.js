import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSpaceStore = defineStore('space', () => {
  // Status saat ini: 'intro', 'orbit', atau 'detail'
  const viewState = ref('intro') 
  
  // Planet yang sedang dilihat
  const targetPlanet = ref(null)

  // Data Planet (Pusat Data)
  const planets = [
    { name: 'Mercury', color: '#A5A5A5', dist: 15, scale: 0.8 },
    { name: 'Venus',   color: '#E3BB76', dist: 22, scale: 1.5 },
    { name: 'Earth',   color: '#22A6B3', dist: 32, scale: 1.6 },
    { name: 'Mars',    color: '#EB4D4B', dist: 42, scale: 1.2 },
    { name: 'Jupiter', color: '#F9CA24', dist: 60, scale: 4.5 },
    { name: 'Saturn',  color: '#F0932B', dist: 80, scale: 3.8 },
    { name: 'Uranus',  color: '#7ED6DF', dist: 95, scale: 2.5 },
    { name: 'Neptune', color: '#686DE0', dist: 110, scale: 2.4 },
  ]

  // Action: Ganti Fokus
  function setFocus(planetName) {
    targetPlanet.value = planetName
    viewState.value = planetName ? 'detail' : 'orbit'
  }

  return { viewState, targetPlanet, planets, setFocus }
})