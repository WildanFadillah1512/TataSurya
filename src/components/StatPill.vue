<!-- src/components/StatPill.vue -->
<script setup>
const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#22d3ee'
  }
})
</script>

<template>
  <div 
    class="stat-pill group"
    :style="{ '--pill-color': color }"
  >
    <div class="pill-icon">
      {{ icon }}
    </div>
    <div class="pill-content">
      <div class="mono-xs text-white/50">{{ label }}</div>
      <div class="mono-lg font-bold text-white">{{ value }}</div>
    </div>
    
    <!-- Glow effect -->
    <div class="pill-glow"></div>
  </div>
</template>

<style scoped>
.stat-pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

.stat-pill:hover {
  transform: translateY(-4px) scale(1.05);
  border-color: var(--pill-color);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.pill-icon {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 8px var(--pill-color));
  transition: transform 0.3s ease;
}

.stat-pill:hover .pill-icon {
  transform: scale(1.2) rotate(10deg);
}

.pill-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.pill-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at center,
    var(--pill-color),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.stat-pill:hover .pill-glow {
  opacity: 0.15;
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.2; }
}

/* Mobile */
@media (max-width: 768px) {
  .stat-pill {
    padding: 0.5rem 1rem;
    gap: 0.5rem;
  }
  
  .pill-icon {
    font-size: 1.25rem;
  }
}
</style>
