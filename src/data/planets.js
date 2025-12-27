// src/data/planets.js

export const solarData = [
  {
    id: 0,
    name: "MATAHARI",
    file: "sun.glb",
    color: "#FDB813",
    desc: "Bintang Pusat Tata Surya",
    title: "Pusat Energi Kehidupan",
    overview: "Matahari adalah bintang di pusat Tata Surya. Ini adalah bola panas raksasa yang hampir sempurna dari plasma panas, dipanaskan hingga pijar oleh reaksi fusi nuklir di intinya. Matahari memancarkan energi ini terutama sebagai cahaya, sinar ultraviolet, dan energi inframerah. Tanpa energinya, kehidupan di Bumi tidak akan ada.",
    structure: "Matahari bukan benda padat seperti Bumi, melainkan bola gas raksasa. Terdiri dari beberapa lapisan: Inti (tempat fusi nuklir), Zona Radiatif, Zona Konvektif, Fotosfer (permukaan yang kita lihat), Kromosfer, dan Korona (atmosfer luar yang sangat panas).",
    atmosphere: "Atmosfer Matahari terdiri dari fotosfer, kromosfer, dan korona. Korona meluas jauh ke luar angkasa dan berubah menjadi angin matahari, aliran partikel bermuatan yang melintasi tata surya.",
    quickStats: [
      { label: "Suhu Permukaan", value: "5.500°C" },
      { label: "Suhu Inti", value: "15 Juta°C" },
      { label: "Diameter", value: "1.39 Juta km" },
      { label: "Usia", value: "4.6 Miliar Tahun" }
    ],
    funFacts: [
      "Matahari menyumbang 99,86% dari total massa Tata Surya.",
      "Cahaya Matahari butuh 8 menit 20 detik untuk sampai ke Bumi.",
      "Satu juta Bumi bisa muat di dalam Matahari."
    ]
  },
  {
    id: 1,
    name: "MERKURIUS",
    file: "mercury.glb",
    color: "#A5A5A5",
    desc: "Planet Terkecil & Tercepat",
    title: "Si Kecil yang Gesit",
    overview: "Merkurius adalah planet terkecil di Tata Surya dan yang terdekat dengan Matahari. Karena jaraknya yang dekat, ia mengalami perubahan suhu yang ekstrem: sangat panas di siang hari dan membeku di malam hari. Permukaannya penuh kawah mirip Bulan kita.",
    structure: "Merkurius adalah planet berbatu dengan inti besi yang sangat besar, menyumbang sekitar 85% dari jari-jarinya. Kerak dan mantel luarnya jauh lebih tipis dibandingkan Bumi.",
    atmosphere: "Hampir tidak memiliki atmosfer. Merkurius hanya memiliki eksosfer tipis yang terdiri dari atom-atom yang terlempar dari permukaan oleh angin matahari dan meteoroid.",
    quickStats: [
      { label: "Jarak dr Matahari", value: "58 Juta km" },
      { label: "Satu Tahun", value: "88 Hari Bumi" },
      { label: "Suhu Siang", value: "430°C" },
      { label: "Suhu Malam", value: "-180°C" }
    ],
    funFacts: [
      "Satu hari di Merkurius (terbit ke terbit) berlangsung selama 176 hari Bumi.",
      "Merkurius tidak memiliki bulan atau cincin.",
      "Matahari akan terlihat 3x lebih besar jika dilihat dari sini."
    ]
  },
  {
    id: 2,
    name: "VENUS",
    file: "venus.glb",
    color: "#E3BB76",
    desc: "Planet Terpanas",
    title: "Bintang Kejora",
    overview: "Venus sering disebut 'saudara kembar' Bumi karena ukurannya yang mirip. Namun, ini adalah tempat yang neraka. Efek rumah kaca yang tak terkendali menjadikannya planet terpanas di Tata Surya, bahkan lebih panas dari Merkurius.",
    structure: "Struktur internal Venus mirip dengan Bumi: inti besi, mantel batuan cair, dan kerak padat. Namun, permukaannya dipenuhi ribuan gunung berapi aktif.",
    atmosphere: "Atmosfer Venus sangat tebal dan beracun, didominasi oleh karbon dioksida dengan awan asam sulfat. Tekanan udaranya 90 kali lipat tekanan di Bumi, setara dengan kedalaman 1 km di bawah laut.",
    quickStats: [
      { label: "Suhu Rata-rata", value: "465°C" },
      { label: "Rotasi", value: "243 Hari (Retrograde)" },
      { label: "Revolusi", value: "225 Hari" },
      { label: "Atmosfer", value: "CO2 & Asam Sulfat" }
    ],
    funFacts: [
      "Venus berputar terbalik (Matahari terbit dari Barat).",
      "Satu hari di Venus lebih lama daripada satu tahunnya.",
      "Benda terpanas di tata surya setelah Matahari."
    ]
  },
  {
    id: 3,
    name: "BUMI",
    file: "earth.glb",
    color: "#22A6B3",
    desc: "Satu-satunya Kehidupan",
    title: "Planet Biru",
    overview: "Rumah kita. Bumi adalah satu-satunya planet yang diketahui memiliki kehidupan. Dengan air cair yang menutupi 70% permukaannya dan atmosfer yang melindungi dari radiasi, Bumi adalah permata biru di ruang hampa yang gelap.",
    structure: "Bumi memiliki kerak padat yang terpecah menjadi lempeng tektonik, mantel semi-cair yang menggerakkan lempeng tersebut, inti luar cair yang menghasilkan medan magnet, dan inti dalam besi padat.",
    atmosphere: "Atmosfer Bumi terdiri dari 78% nitrogen, 21% oksigen, dan gas lainnya. Lapisan ini melindungi kita dari meteoroid dan radiasi UV yang berbahaya.",
    quickStats: [
      { label: "Populasi", value: "~8 Miliar" },
      { label: "Satelit Alami", value: "1 (Bulan)" },
      { label: "Diameter", value: "12.742 km" },
      { label: "Suhu Rata-rata", value: "15°C" }
    ],
    funFacts: [
      "Bumi sebenarnya tidak bulat sempurna, agak lonjong di khatulistiwa.",
      "Satu-satunya planet yang tidak dinamai dewa Romawi/Yunani.",
      "Medan magnet Bumi melindungi kita dari angin matahari."
    ]
  },
  {
    id: 9,
    name: "BULAN",
    file: "moon.glb",
    color: "#9ea7b0",
    desc: "Satelit Alami Bumi",
    title: "Bulan",
    overview: "Bulan adalah satelit alami Bumi, terbentuk sekitar 4,5 miliar tahun lalu. Bulan mempengaruhi pasang surut laut dan ritme beberapa proses di Bumi. Permukaannya dipenuhi kawah dan lautan basal yang disebut 'maria'.",
    structure: "Bulan memiliki inti kecil (besi), mantel batuan, dan kerak tipis. Tidak memiliki atmosfer yang signifikan sehingga permukaannya tidak mengalami erosi atmosferik.",
    atmosphere: "Hampir tidak memiliki atmosfer; hanya eksosfer tipis sehingga tidak ada cuaca seperti di Bumi.",
    quickStats: [
      { label: "Diameter", value: "3.474 km" },
      { label: "Jarak dr Bumi", value: "384.400 km" },
      { label: "Rotasi", value: "27.3 Hari" },
      { label: "Gravitasi", value: "0.27x Bumi" }
    ],
    funFacts: [
      "Bulan kemungkinan terbentuk akibat tabrakan besar antara Bumi dan objek seukuran Mars.",
      "Sisi jauh Bulan belum pernah diinjak oleh manusia hingga kini hanya sedikit dieksplorasi secara langsung.",
      "Bulan berperan penting dalam stabilisasi kemiringan sumbu Bumi dan pasang surut laut."
    ]
  },
  {
    id: 4,
    name: "MARS",
    file: "mars.glb",
    color: "#EB4D4B",
    desc: "Planet Merah",
    title: "Tujuan Masa Depan",
    overview: "Mars adalah planet yang dingin dan berdebu. Warna merahnya berasal dari oksida besi (karat) di tanahnya. Mars memiliki gunung berapi terbesar dan lembah terdalam di Tata Surya. Para ilmuwan percaya Mars pernah memiliki air cair di masa lalu.",
    structure: "Mars memiliki inti padat yang dikelilingi oleh mantel batuan silikat dan kerak padat. Inti Mars lebih kecil dan kurang padat dibandingkan Bumi.",
    atmosphere: "Atmosfer Mars sangat tipis (100x lebih tipis dari Bumi) dan sebagian besar terdiri dari karbon dioksida, membuatnya tidak bisa menahan panas matahari.",
    quickStats: [
      { label: "Jarak dr Matahari", value: "228 Juta km" },
      { label: "Gravitasi", value: "37% dari Bumi" },
      { label: "Satelit", value: "2 (Phobos & Deimos)" },
      { label: "Satu Hari", value: "24 Jam 37 Menit" }
    ],
    funFacts: [
      "Gunung Olympus Mons di Mars 3x lebih tinggi dari Everest.",
      "Mars memiliki badai debu yang bisa menutupi seluruh planet.",
      "Matahari terlihat berwarna biru saat terbenam di Mars."
    ]
  },
  {
    id: 5,
    name: "JUPITER",
    file: "jupiter.glb",
    color: "#D35400",
    desc: "Raja Planet",
    title: "Raksasa Gas",
    overview: "Jupiter adalah planet terbesar di Tata Surya. Saking besarnya, semua planet lain bisa muat di dalamnya. Jupiter adalah bola gas raksasa dengan badai abadi, termasuk Bintik Merah Raksasa yang terkenal.",
    structure: "Jupiter tidak memiliki permukaan padat. Sebagian besar terdiri dari hidrogen dan helium. Semakin ke dalam, gas berubah menjadi cairan logam hidrogen karena tekanan ekstrem.",
    atmosphere: "Atmosfer Jupiter penuh dengan awan tebal yang membentuk garis-garis berwarna. Angin di sini bertiup sangat kencang, mencapai 600 km/jam.",
    quickStats: [
      { label: "Diameter", value: "11x Bumi" },
      { label: "Satu Hari", value: "9 Jam 55 Menit" },
      { label: "Satelit", value: "95 (Diketahui)" },
      { label: "Jenis", value: "Raksasa Gas" }
    ],
    funFacts: [
      "Bintik Merah Raksasa adalah badai yang lebih besar dari Bumi.",
      "Jupiter memiliki cincin tipis yang sulit dilihat.",
      "Berfungsi sebagai 'perisai' Bumi dengan menyedot asteroid."
    ]
  },
  {
    id: 6,
    name: "SATURNUS",
    file: "saturn.glb",
    color: "#F0932B",
    desc: "Permata Tata Surya",
    title: "Ratu Cincin",
    overview: "Saturnus terkenal dengan sistem cincinnya yang spektakuler, terdiri dari miliaran potongan es dan batu. Seperti Jupiter, Saturnus adalah raksasa gas yang sebagian besar terdiri dari hidrogen dan helium.",
    structure: "Saturnus memiliki inti berbatu kecil yang dikelilingi oleh hidrogen logam cair dan lapisan gas luar. Planet ini adalah yang paling tidak padat di Tata Surya.",
    atmosphere: "Atmosfer Saturnus berwarna kuning pucat karena kristal amonia di atmosfer atasnya. Angin di ekuator Saturnus bisa mencapai 1.800 km/jam.",
    quickStats: [
      { label: "Satelit", value: "146 (Terbanyak)" },
      { label: "Lebar Cincin", value: "282.000 km" },
      { label: "Satu Tahun", value: "29 Tahun Bumi" },
      { label: "Suhu", value: "-140°C" }
    ],
    funFacts: [
      "Jika ada bak mandi raksasa, Saturnus akan mengapung di air.",
      "Cincinnya sangat tipis, rata-rata hanya setebal 10 meter.",
      "Titan, bulan Saturnus, memiliki danau metana cair."
    ]
  },
  {
    id: 7,
    name: "URANUS",
    file: "uranus.glb",
    color: "#7ED6DF",
    desc: "Raksasa Es",
    title: "Planet Miring",
    overview: "Uranus adalah planet yang aneh; ia berputar pada sisinya (miring 98 derajat), seolah-olah menggelinding mengelilingi Matahari. Ini memberinya musim yang sangat ekstrem yang berlangsung selama 20 tahun.",
    structure: "Uranus disebut Raksasa Es. Di bawah atmosfernya terdapat mantel cair yang terdiri dari air, metana, dan amonia yang membungkus inti berbatu kecil.",
    atmosphere: "Warna biru-kehijauan Uranus berasal dari gas metana di atmosfernya yang menyerap cahaya merah. Ini adalah planet dengan atmosfer terdingin di Tata Surya.",
    quickStats: [
      { label: "Suhu Terdingin", value: "-224°C" },
      { label: "Satelit", value: "27 Buah" },
      { label: "Satu Tahun", value: "84 Tahun Bumi" },
      { label: "Rotasi", value: "17 Jam (Retrograde)" }
    ],
    funFacts: [
      "Berputar miring seperti bola yang menggelinding.",
      "Ditemukan menggunakan teleskop (bukan mata telanjang).",
      "Memiliki 13 cincin redup."
    ]
  },
  {
    id: 8,
    name: "NEPTUNUS",
    file: "neptune.glb",
    color: "#4834D4",
    desc: "Si Biru Jauh",
    title: "Penguasa Angin",
    overview: "Neptunus adalah planet terjauh dari Matahari. Gelap, dingin, dan diterpa angin supersonik. Ini adalah raksasa es kedua setelah Uranus. Karena jaraknya yang jauh, siang hari di Neptunus tampak seperti senja yang redup di Bumi.",
    structure: "Mirip dengan Uranus, interior Neptunus terdiri dari es dan batu. Intinya diperkirakan seukuran Bumi.",
    atmosphere: "Atmosfer Neptunus sangat aktif dengan badai besar yang terlihat sebagai bintik gelap. Angin di sini adalah yang tercepat di Tata Surya, mencapai 2.100 km/jam.",
    quickStats: [
      { label: "Jarak", value: "4.5 Miliar km" },
      { label: "Satu Tahun", value: "165 Tahun Bumi" },
      { label: "Satelit", value: "14 (Triton terbesar)" },
      { label: "Kecepatan Angin", value: "2.100 km/jam" }
    ],
    funFacts: [
      "Satu tahun di Neptunus = 165 tahun di Bumi.",
      "Triton (bulannya) menyemburkan geyser es nitrogen.",
      "Memiliki warna biru yang lebih dalam dibanding Uranus."
    ]
  }
]