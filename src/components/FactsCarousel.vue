<!-- src/components/FactsCarousel.vue -->
<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  facts: {
    type: Array,
    required: true
  },
  autoAdvance: {
    type: Number,
    default: 8000
  },
  color: {
    type: String,
    default: '#22d3ee'
  }
})

const emit = defineEmits(['fact-change'])

const currentIndex = ref(0)
const isAnimating = ref(false)
let autoTimer = null

const currentFact = computed(() => props.facts[currentIndex.value] || '')

const nextFact = () => {
  if (isAnimating.value) return
  isAnimating.value = true
  
  currentIndex.value = (currentIndex.value + 1) % props.facts.length
  emit('fact-change', currentFact.value, currentIndex.value)
  
  setTimeout(() => {
    isAnimating.value = false
  }, 600)
  
  resetAutoTimer()
}

const prevFact = () => {
  if (isAnimating.value) return
  isAnimating.value = true
  
  currentIndex.value = (currentIndex.value - 1 + props.facts.length) % props.facts.length
  emit('fact-change', currentFact.value, currentIndex.value)
  
  setTimeout(() => {
    isAnimating.value = false
  }, 600)
  
  resetAutoTimer()
}

const goToFact = (index) => {
  if (isAnimating.value || index === currentIndex.value) return
  isAnimating.value = true
  
  currentIndex.value = index
  emit('fact-change', currentFact.value, index)
  
  setTimeout(() => {
    isAnimating.value = false
  }, 600)
  
  resetAutoTimer()
}

const resetAutoTimer = () => {
  if (autoTimer) clearInterval(autoTimer)
  if (props.autoAdvance > 0) {
    autoTimer = setInterval(nextFact, props.autoAdvance)
  }
}

onMounted(() => {
  resetAutoTimer()
  emit('fact-change', currentFact.value, 0)
})

onUnmounted(() => {
  if (autoTimer) clearInterval(autoTimer)
})
</script>

<template>
  <div class="facts-carousel" :style="{ '--carousel-color': color }">
    <!-- Fact display -->
    <div class="fact-display">
      <Transition name="fact-slide" mode="out-in">
        <p :key="currentIndex" class="body-lg text-white leading-relaxed">
          {{ currentFact }}
        </p>
      </Transition>
    </div>

    <!-- Controls -->
    <div class="carousel-controls">
      <button 
        @click="prevFact" 
        class="carousel-btn"
        :disabled="isAnimating"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>

      <!-- Progress dots -->
      <div class="progress-dots">
        <button
          v-for="(_, index) in facts"
          :key="index"
          @click="goToFact(index)"
          class="dot"
          :class="{ active: index === currentIndex }"
        >
          <span class="sr-only">Fact {{ index + 1 }}</span>
        </button>
      </div>

      <button 
        @click="nextFact" 
        class="carousel-btn"
        :disabled="isAnimating"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.facts-carousel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.fact-display {
  position: relative;
  min-height: 120px;
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.carousel-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.carousel-btn {
  display: flex;
  align-items: center;
  justify-center: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.carousel-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--carousel-color);
  transform: scale(1.1);
  box-shadow: 0 0 20px var(--carousel-color);
}

.carousel-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.progress-dots {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  padding: 0;
}

.dot:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.3);
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  background: var(--carousel-color);
  box-shadow: 0 0 12px var(--carousel-color);
}

/* Transitions */
.fact-slide-enter-active,
.fact-slide-leave-active {
  transition: all 0.4s ease;
}

.fact-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.fact-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Mobile */
@media (max-width: 768px) {
  .fact-display {
    min-height: 100px;
    padding: 1rem;
  }
  
  .carousel-btn {
    width: 36px;
    height: 36px;
  }
}
</style>
