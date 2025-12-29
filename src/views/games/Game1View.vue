<template>
  <div class="game-screen">
    <h1>Game 1: Tebak Planet</h1>
    <p>Halaman ini sudah berhasil dimuat.</p>
    <p>Area permainan akan dibuat nanti.</p>
    
    <router-link to="/game" class="back-link">
      ⬅ Kembali ke Menu
    </router-link>
  </div>
</template>

<style scoped>
.game-screen {
  color: white;
  padding: 50px;
  text-align: center;
  /* Tambahkan background sementara biar tidak transparan total */
  background-color: rgba(0, 0, 0, 0.8); 
  min-height: 100vh;
}
.back-link {
  color: #00d2ff;
  margin-top: 20px;
  display: inline-block;
  text-decoration: none;
  font-weight: bold;
  border: 1px solid #00d2ff;
  padding: 10px 20px;
  border-radius: 5px;
}
.back-link:hover {
  background-color: #00d2ff;
  color: black;
}
</style>