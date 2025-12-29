<template>
  <div class="game-screen">
    <h1>Game 2: Space Quiz</h1>
    <p>Halaman ini sudah berhasil dimuat.</p>
    <p>Kuis akan dibuat nanti.</p>
    
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
  background-color: rgba(0, 0, 0, 0.8);
  min-height: 100vh;
}
.back-link {
  color: #ff9800; /* Beda warna dikit biar variasi */
  margin-top: 20px;
  display: inline-block;
  text-decoration: none;
  font-weight: bold;
  border: 1px solid #ff9800;
  padding: 10px 20px;
  border-radius: 5px;
}
.back-link:hover {
  background-color: #ff9800;
  color: black;
}
</style>