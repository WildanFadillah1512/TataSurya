<script setup>
// Logic game akan ditambahkan nanti
</script>

<template>
  <div class="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center font-mono">
    
    <div class="text-center space-y-4">
      <div class="text-6xl mb-4 animate-bounce">🕹️</div>
      
      <h1 class="text-4xl md:text-6xl font-bold text-purple-500 tracking-widest">
        SIMULATION
      </h1>
      
      <p class="text-gray-400 tracking-widest uppercase text-sm">
        Modul permainan sedang offline.
      </p>
    </div>

    <router-link 
      to="/selection" 
      class="mt-12 px-8 py-3 border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-all duration-300 rounded uppercase tracking-widest text-xs"
    >
      Batalkan Misi
    </router-link>

  </div>
</template>