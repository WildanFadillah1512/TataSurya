<!-- src/components/HolographicCard.vue -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  layer: {
    type: Number,
    default: 0
  },
  color: {
    type: String,
    default: '#22d3ee'
  },
  title: {
    type: String,
    default: ''
  },
  delay: {
    type: Number,
    default: 0
  }
})

// Transform berdasarkan layer untuk depth effect
const layerStyle = computed(() => ({
  transform: `translateZ(${props.layer * 20}px)`,
  animationDelay: `${props.delay}ms`,
  '--accent-color': props.color
}))
</script>

<template>
  <div 
    class="holographic-card group"
    :style="layerStyle"
  >
    <!-- Header dengan accent color -->
    <div v-if="title" class="card-header-custom">
      <div class="flex items-center gap-3">
        <div class="w-1 h-6 rounded-full bg-current" :style="{ color }"></div>
        <h3 class="heading-sm text-white uppercase tracking-wider">
          {{ title }}
        </h3>
      </div>
      <div class="w-8 h-[2px] rounded-full opacity-30" :style="{ backgroundColor: color }"></div>
    </div>

    <!-- Content slot -->
    <div class="card-content">
      <slot></slot>
    </div>

    <!-- Corner decorations -->
    <div class="corner-top-left"></div>
    <div class="corner-bottom-right"></div>
  </div>
</template>

<style scoped>
.holographic-card {
  position: relative;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0.02) 100%
  );
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: 2rem;
  
  /* Animation */
  animation: card-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  opacity: 0;
  transform: translateX(50px) translateZ(0);
  
  /* 3D Transform */
  transform-style: preserve-3d;
  
  /* Hover effect */
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes card-enter {
  to {
    opacity: 1;
    transform: translateX(0) translateZ(var(--layer-z, 0));
  }
}

.holographic-card:hover {
  transform: translateY(-8px) translateZ(var(--layer-z, 0)) scale(1.02);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 40px var(--accent-color, #22d3ee);
}

.holographic-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 24px;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.3),
    transparent 50%,
    rgba(255, 255, 255, 0.1)
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.5;
  pointer-events: none;
}

.card-header-custom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-content {
  position: relative;
  z-index: 1;
}

/* Corner decorations */
.corner-top-left,
.corner-bottom-right {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid var(--accent-color, #22d3ee);
  opacity: 0.4;
  transition: opacity 0.3s ease;
}

.corner-top-left {
  top: 12px;
  left: 12px;
  border-right: none;
  border-bottom: none;
}

.corner-bottom-right {
  bottom: 12px;
  right: 12px;
  border-left: none;
  border-top: none;
}

.holographic-card:hover .corner-top-left,
.holographic-card:hover .corner-bottom-right {
  opacity: 0.8;
}

/* Responsive */
@media (max-width: 768px) {
  .holographic-card {
    padding: 1.5rem;
    border-radius: 16px;
  }
  
  .holographic-card:hover {
    transform: translateY(-4px) scale(1.01);
  }
}
</style>
