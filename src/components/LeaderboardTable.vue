<script setup>
defineProps({
  data: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

const getRankClass = (rank) => {
  if (rank == 1) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]';
  if (rank == 2) return 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]';
  if (rank == 3) return 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]';
  return 'text-white/70';
};
</script>

<template>
  <div class="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md">
    <!-- Header -->
    <div class="grid grid-cols-12 gap-4 border-b border-white/10 bg-white/5 py-4 px-6 text-xs font-bold uppercase tracking-widest text-cyan-300">
      <div class="col-span-1 text-center">#</div>
      <div class="col-span-3">Astronaut</div>
      <div class="col-span-3">Mission Type</div>
      <div class="col-span-2 text-right">Score</div>
      <div class="col-span-3 text-right">Date</div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex h-64 items-center justify-center p-8">
      <div class="flex flex-col items-center gap-4">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
        <div class="text-sm tracking-wider text-cyan-500/80 animate-pulse">MEMUAT DATA TRANSMISI...</div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="data.length === 0" class="flex h-64 items-center justify-center p-8 text-white/50">
      <div class="text-center">
        <div class="text-4xl mb-2">📡</div>
        <div class="text-sm font-light tracking-wide">TIDAK ADA DATA DITEMUKAN</div>
      </div>
    </div>

    <!-- Data Rows -->
    <div v-else class="max-h-[60vh] overflow-y-auto custom-scrollbar">
      <div 
        v-for="(item, index) in data" 
        :key="index"
        class="grid grid-cols-12 gap-4 border-b border-white/5 py-4 px-6 transition-all hover:bg-white/5 items-center group"
        :class="{'bg-yellow-500/5': index == 0, 'bg-gray-400/5': index == 1, 'bg-orange-500/5': index == 2}"
      >
        <!-- Rank -->
        <div class="col-span-1 flex justify-center">
          <div 
            class="flex h-8 w-8 items-center justify-center rounded-full font-black text-lg font-mono"
            :class="getRankClass(index + 1)"
          >
            {{ index + 1 }}
          </div>
        </div>

        <!-- Name -->
        <div class="col-span-3 flex items-center gap-3">
          <div class="h-8 w-8 rounded bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center text-xs border border-white/10 text-cyan-200 font-bold group-hover:border-cyan-500/50 transition-colors shrink-0">
            {{ item.name.charAt(0).toUpperCase() }}
          </div>
          <span class="font-bold tracking-wide text-white group-hover:text-cyan-300 transition-colors truncate text-sm">
            {{ item.name }}
          </span>
        </div>

        <!-- Type -->
        <div class="col-span-3 text-xs text-white/70 uppercase tracking-tight truncate border-l border-white/5 pl-2">
            {{ item.type || 'Unknown Mission' }}
        </div>

        <!-- Score -->
        <div class="col-span-2 text-right font-mono text-cyan-400 font-bold text-base tracking-wider">
          {{ item.score }}
        </div>

        <!-- Date -->
        <div class="col-span-3 text-right font-mono text-white/40 text-[10px] uppercase">
          {{ item.date }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.2);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.4);
}
</style>
