<script setup>
import { ref } from 'vue'
const props = defineProps({ planetName: { type: String, default: '' }, currentEvent: { type: String, default: null } })
const emit = defineEmits(['start-event','toggle-ar','toggle-audio','quiz','next','close'])
const events = ['solar-eclipse','seasons','day-night','comet']
</script>

<template>
  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
    <aside class="w-full max-w-3xl pointer-events-auto p-4 md:p-6 rounded-2xl bg-gradient-to-b from-cyan-900/20 to-transparent border border-cyan-400/10 backdrop-blur-lg text-white shadow-md transition-transform transform-gpu">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-400/20 to-blue-500/10 border border-cyan-300/10 flex items-center justify-center text-xl font-bold">◎</div>
          <div>
            <div class="text-xs text-cyan-200 uppercase tracking-wider">Orbit Dashboard</div>
            <div class="text-lg font-bold">{{ planetName }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="$emit('close')" class="px-3 py-1 rounded bg-black/20 hover:bg-black/30 text-sm">Collapse</button>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="col-span-2">
          <!-- Orbit visualization (simple SVG ring) -->
          <div class="w-full flex items-center justify-center">
            <svg viewBox="0 0 200 120" class="max-w-full h-36">
              <ellipse cx="100" cy="60" rx="70" ry="28" fill="none" stroke="rgba(99,102,241,0.15)" stroke-width="6"/>
              <circle cx="170" cy="60" r="3" fill="#fbbf24" /> <!-- sun marker -->
              <circle cx="100" cy="32" r="4" fill="#9ca3af" /> <!-- moon marker -->
              <text x="10" y="110" class="text-xs fill-current text-cyan-200">Orbit scale approximate</text>
            </svg>
          </div>

          <div class="mt-3 text-sm text-slate-200 font-mono leading-relaxed">
            <div class="mb-2">Current: <span class="text-cyan-300">{{ currentEvent || 'None' }}</span></div>
            <div class="flex flex-wrap gap-2">
              <button v-for="ev in events" :key="ev" @click="$emit('start-event', ev)" class="px-3 py-1 rounded bg-cyan-600/10 hover:bg-cyan-600/20 text-sm">{{ ev.replace(/-/g, ' ') }}</button>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <button @click="$emit('next')" class="w-full px-3 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 text-sm">Next Fact</button>
          <button @click="$emit('toggle-ar')" class="w-full px-3 py-2 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 text-sm">Toggle AR</button>
          <button @click="$emit('toggle-audio')" class="w-full px-3 py-2 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-200 text-sm">Speak</button>
          <button @click="$emit('quiz')" class="w-full px-3 py-2 rounded bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-200 text-sm">Start Quiz</button>
        </div>
      </div>

      <div class="mt-3 text-[11px] text-cyan-200 opacity-75">Tip: Dashboard memberi konteks orbit & event controls tanpa menghalangi tampilan 3D.</div>
    </aside>
  </div>
</template>

<style scoped>
/* minimal styling, rely on tailwind utilities for layout */
</style>
