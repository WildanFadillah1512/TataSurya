<script setup>
import { ref } from 'vue';

const props = defineProps({
  show: Boolean,
  title: {
    type: String,
    default: 'DATA TRANSMISSION'
  },
  showBack: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['submit', 'back']);
const playerName = ref('');

const handleSubmit = () => {
  if (playerName.value.trim().length >= 3) {
    emit('submit', playerName.value.trim());
  }
};

const handleBack = () => {
  emit('back');
};
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto cursor-default" @mousedown.stop @touchstart.stop>
      <div class="w-full max-w-md bg-gray-900/90 border-2 border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.2)] relative overflow-hidden group">
        <!-- Decoration -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>
        
        <div class="relative z-10 text-center">
          <div class="text-[10px] font-mono text-cyan-400 tracking-[0.4em] uppercase mb-2 animate-pulse">Authentication Required</div>
          <h2 class="text-3xl font-black text-white italic tracking-tighter uppercase mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            {{ title }}
          </h2>
          
          <p class="text-gray-400 text-sm font-mono mb-8">IDENTITY YOURSELF, ASTRONAUT</p>
          
          <div class="space-y-6">
            <div class="relative">
              <input 
                v-model="playerName"
                type="text"
                maxlength="15"
                placeholder="ENTER CALLSIGN..."
                @keyup.enter="handleSubmit"
                class="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 text-white font-mono tracking-widest focus:outline-none focus:border-cyan-500/50 transition-all text-center uppercase"
              >
              <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-cyan-500 transition-all duration-500" :style="{ width: playerName.length > 0 ? '100%' : '0' }"></div>
            </div>

            <button 
              @click="handleSubmit"
              :disabled="playerName.trim().length < 3"
              class="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(8,145,178,0.4)]"
            >
              INITIALIZE MISSION
            </button>
            
            <!-- Back Button -->
            <button 
              v-if="showBack"
              @click="handleBack"
              class="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-bold tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <span>←</span> KEMBALI
            </button>
            
            <p v-if="playerName.trim().length > 0 && playerName.trim().length < 3" class="text-red-400 text-[10px] font-mono animate-pulse">
              MINIMUM 3 CHARACTERS REQUIRED
            </p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
</style>
