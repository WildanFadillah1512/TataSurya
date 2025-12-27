<template>
  <div class="min-h-screen relative overflow-hidden font-mono flex flex-col items-center justify-center p-4 md:p-6 bg-black text-white select-none">
    
    <div class="absolute inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1026] to-black pointer-events-none"></div>
      
      <div v-for="n in 50" :key="`star-${n}`" class="absolute bg-white rounded-full animate-twinkle pointer-events-none" :style="getRandomStarStyle()"></div>
    </div>

    <div v-if="quizSession" class="relative w-full max-w-4xl z-10 flex flex-col h-full max-h-[90vh]">
      
      <div class="flex justify-between items-center mb-6 px-2">
        <button 
          type="button"
          @click="goBack"
          class="group w-12 h-12 pointer-events-auto z-30 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/20 backdrop-blur transition-all active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-cyan-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="bg-black/60 backdrop-blur-md border border-cyan-500/50 px-6 py-2 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)] flex gap-3 text-xl items-center">
          <span class="text-cyan-400 font-bold tracking-widest text-sm">SCORE</span>
          <span class="text-white font-black text-2xl font-sans">{{ finalScore }}%</span>
        </div>
      </div>

      <transition name="zoom-fade" mode="out-in">
        
        <div v-if="!showResult" key="question" class="flex-1 flex flex-col justify-center w-full relative">
          
          <div class="absolute -top-12 left-1/2 -translate-x-1/2 z-30 transition-transform" :class="{ 'cursor-pointer hover:scale-110': speechAvailable && !speechBusy, 'opacity-60 cursor-not-allowed': !speechAvailable }" @click="playQuestionAudio">
            <div class="text-[5rem] drop-shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-float">
              {{ mascotExpression }}
            </div>
          </div>

          <div class="bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[2.5rem] p-8 pt-16 min-h-[260px] flex flex-col items-center justify-center text-center relative overflow-hidden group">
            
            <button @click.stop="playQuestionAudio" :disabled="!speechAvailable || speechBusy" :class="['absolute top-5 right-5 p-2 rounded-full transition-all', (!speechAvailable || speechBusy) ? 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-800/20' : 'text-cyan-500 hover:text-white bg-cyan-900/30 hover:bg-cyan-500/50']">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            </button>

            <div class="absolute top-14 right-4 mt-2 text-xs text-slate-400 flex flex-col items-end pointer-events-auto">
              <div class="whitespace-nowrap">{{ voiceStatusMsg }}</div>
              <button v-if="!speechAvailable" @click="enableSpeech" class="mt-1 text-xs px-2 py-1 bg-white/5 rounded hover:bg-white/10">Aktifkan Suara</button>
            </div>

            <h2 class="text-xl md:text-3xl font-bold text-white leading-relaxed relative z-10 font-sans">
              {{ currentQuestion.q }}
            </h2>

            <div class="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500" :style="{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }"></div>
          </div>

          <div class="relative h-14 flex items-center justify-center -my-7 z-30 pointer-events-none">
            <div class="w-16 h-16 bg-black rounded-full flex items-center justify-center border-4 border-slate-800 ring-2 ring-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <span class="text-2xl font-black text-white">{{ currentQuestionIndex + 1 }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 w-full pb-4">
            <button
              v-for="(option, index) in currentQuestion.a"
              :key="index"
              @click="handleAnswer(index)"
              :disabled="isAnswered || !currentQuestion"
              class="relative group h-auto min-h-[75px] rounded-2xl border border-white/10 transition-all duration-200 active:scale-95 flex items-center px-6 py-4 overflow-hidden pointer-events-auto"
              :class="getOptionClass(index)"
            >
              <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm mr-4 transition-colors duration-300 font-sans"
                   :class="getLabelClass(index)">
                {{ ["A", "B", "C", "D"][index] }}
              </div>

              <span class="text-lg font-medium text-left flex-1 font-sans">{{ option }}</span>

              <span v-if="isAnswered && index === currentQuestion.correct" class="absolute right-4 text-2xl animate-pop-in">✅</span>
              <span v-if="isAnswered && selectedOption === index && index !== currentQuestion.correct" class="absolute right-4 text-2xl animate-pop-in">❌</span>
            </button>
          </div>
        </div>

        <div v-else key="result" class="flex-1 flex flex-col items-center justify-center w-full">
<div class="bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 text-center w-full max-w-xl shadow-[0_0_60px_rgba(6,182,212,0.15)] relative z-20 overflow-hidden transform transition-all hover:scale-[1.01]">
            
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div class="mb-6 relative inline-block z-10">
              <div class="text-[6rem] animate-bounce-slow">{{ resultEmoji }}</div>
              <div class="absolute -bottom-2 -right-4 bg-yellow-500 text-black font-black px-3 py-1 rounded-md text-sm shadow-lg rotate-12 font-sans border border-yellow-300">
                {{ finalScore }} / 100
              </div>
            </div>

            <h2 class="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight z-10 relative font-sans">
              {{ resultTitle }}
            </h2>
            <p class="text-slate-400 font-mono mb-8 text-sm md:text-base z-10 relative">
              Kamu berhasil mengumpulkan <span class="text-cyan-400 font-bold text-lg">{{ score * 20 }} Poin</span>
            </p>

            <div class="flex flex-col gap-3 justify-center w-full z-10 relative">
              <!-- name input for Netlify Forms submission -->
              <div class="flex gap-2 items-center w-full">
                <input v-model="userName" placeholder="Masukkan nama Anda" class="flex-1 px-4 py-3 rounded-xl bg-black/20 border border-white/10 placeholder:text-slate-400 text-white focus:outline-none" />
                <div class="text-sm text-slate-400">{{ submitStatus }}</div>
              </div>

              <button type="button" @click="restartQuiz" class="w-full pointer-events-auto z-30 bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-bold tracking-widest uppercase transition-all border border-white/10 font-sans">
                ↺ Ulangi Misi
              </button>
              <button type="button" @click="finishQuiz" :disabled="isSubmitting || !userName" class="w-full pointer-events-auto z-30 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-4 rounded-xl font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] font-sans disabled:opacity-50 disabled:cursor-not-allowed">
                🚀 Selesai
              </button>
            </div>
          </div>
        </div>

      </transition>
    </div>

    <div v-else class="text-center z-10">
      <h1 class="text-2xl font-bold text-red-500">Misi Tidak Ditemukan (404)</h1>
      <button @click="router.back()" class="mt-4 text-white underline">Kembali ke Markas</button>
    </div>

    <div v-if="showConfetti" class="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <div v-for="n in 30" :key="n" class="absolute w-2 h-2 bg-yellow-400 animate-confetti" :style="getConfettiStyle()"></div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { quizData } from "../data/quizData"; // Menggunakan data quiz baru
import speech from "../utils/speech";

const route = useRoute();
const router = useRouter();

const goBack = () => {
  console.log('[Quiz] goBack called');
  router.back();
};

// State
const quizSession = ref(null);
const currentQuestionIndex = ref(0);
const score = ref(0);
const isAnswered = ref(false);
const selectedOption = ref(null);
const isCorrect = ref(false);
const showResult = ref(false);
const showConfetti = ref(false);
const speechAvailable = ref(false);
const speechBusy = ref(false);

// diagnostics for speech
const voiceStatusMsg = ref('');
const enableSpeech = async () => {
  try {
    voiceStatusMsg.value = 'Memuat suara...';
    await speech.initVoices();
    const c = speech.getVoicesCount();
    voiceStatusMsg.value = c ? `Suara siap (${c})` : 'Tidak ada suara terdeteksi. Coba ketuk layar lalu tekan Aktifkan Suara (khusus iOS).';
    speechAvailable.value = speech.isAvailable() && c > 0;
  } catch (e) {
    voiceStatusMsg.value = 'Gagal memuat suara';
    console.warn('[Speech] enable failed', e);
  }
};

// --- LOAD DATA ---
onMounted(() => {
  const paramId = route.params.id;
  // Jika ID angka (Planet), parse int. Jika string ('events'), biarkan string.
  const targetId = isNaN(paramId) ? paramId : parseInt(paramId);
  
  const found = quizData.find(q => q.targetId === targetId);
  if (found) {
    quizSession.value = found;
  } else {
    console.error("Quiz ID not found:", targetId);
  }

  // Speech availability + warm-up (background)
  try {
    speechAvailable.value = speech.isAvailable();
    if (speechAvailable.value) {
      speech.initVoices()
        .then(() => {
          const count = speech.getVoicesCount();
          speechAvailable.value = count > 0;
          voiceStatusMsg.value = count ? `Suara siap (${count})` : 'Tidak ada suara terdeteksi';
          console.log('[Speech] warm-up voices:', count);
        })
        .catch(e => { console.warn('[Speech] init failed', e); voiceStatusMsg.value = 'Gagal memuat suara' });
    } else {
      voiceStatusMsg.value = 'Speech tidak didukung di browser ini';
    }
  } catch (e) { console.warn('[Speech] check failed', e); voiceStatusMsg.value = 'Gagal periksa kemampuan suara' }
});

// Computed Properties
const questions = computed(() => quizSession.value ? quizSession.value.questions : []);
const totalQuestions = computed(() => questions.value.length);
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value]);
const finalScore = computed(() => totalQuestions.value ? Math.round((score.value / totalQuestions.value) * 100) : 0); // Skala 0-100 (dinamis berdasarkan jumlah soal)

// Visual Logics
const mascotExpression = computed(() => {
  if (showResult.value) return finalScore.value >= 80 ? "👨‍🚀" : "👽";
  if (isAnswered.value) return isCorrect.value ? "🤩" : "😵";
  return "🤔";
});

const resultEmoji = computed(() => {
  if (finalScore.value === 100) return "👑";
  if (finalScore.value >= 60) return "🌌";
  return "☄️";
});

const resultTitle = computed(() => {
  if (finalScore.value === 100) return "SEMPURNA!";
  if (finalScore.value >= 60) return "MISI SUKSES!";
  return "COBA LAGI!";
});

// --- STYLING HELPERS ---
const getRandomStarStyle = () => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  width: `${Math.random() * 3}px`,
  height: `${Math.random() * 3}px`,
  opacity: Math.random(),
  animationDelay: `${Math.random() * 5}s`
});

const getConfettiStyle = () => ({
  left: `${Math.random() * 100}%`,
  backgroundColor: ['#22D3EE', '#E879F9', '#FDB813', '#FFFFFF'][Math.floor(Math.random() * 4)],
  animationDuration: `${1 + Math.random()}s`,
  animationDelay: `${Math.random() * 0.2}s`
});

const getOptionClass = (index) => {
  const base = "bg-white/5 text-gray-300 cursor-pointer hover:bg-white/10 hover:border-cyan-500/50";
  
  if (!isAnswered.value) return base;

  if (index === currentQuestion.value.correct) {
    return "bg-green-500/20 border-green-500 text-green-200 ring-1 ring-green-500 z-10";
  }
  if (selectedOption.value === index && index !== currentQuestion.value.correct) {
    return "bg-red-500/20 border-red-500 text-red-200 opacity-80";
  }
  return "bg-black/40 text-gray-600 opacity-40 border-transparent grayscale";
};

const getLabelClass = (index) => {
  if (!isAnswered.value) return "bg-white/10 text-gray-400 group-hover:bg-cyan-500 group-hover:text-black";
  if (index === currentQuestion.value.correct) return "bg-green-500 text-black";
  if (selectedOption.value === index) return "bg-red-500 text-white";
  return "bg-gray-800 text-gray-600";
};

// --- ACTIONS ---
const playQuestionAudio = async () => {
  if (!speechAvailable.value) { console.warn('[Speech] not available'); return }
  const cq = currentQuestion.value
  if (!cq) return
  try {
    speechBusy.value = true
    await speech.speak(cq.q, { lang: 'id-ID' })
  } catch (e) { console.warn('[Speech] speak failed', e); voiceStatusMsg.value = 'Gagal memutar suara: ' + (e && e.message ? e.message : 'error') }
  finally { speechBusy.value = false }
};

const handleAnswer = (index) => {
  // Debug: ensure clicks are received
  console.log("[Quiz] answer clicked:", index, "currentQuestionIndex:", currentQuestionIndex.value);

  if (isAnswered.value) return;
  
  // Stop audio if playing (guarded)
  try { speech.cancel() } catch(e) { console.warn('speech cancel failed', e) }

  const cq = currentQuestion.value;
  if (!cq) {
    console.warn("[Quiz] no current question available");
    return;
  }

  selectedOption.value = index;
  isAnswered.value = true;
  isCorrect.value = index === cq.correct;

  if (isCorrect.value) {
    score.value++;
    triggerConfetti();
  } else {
    // Haptic feedback for mobile (guarded)
    try { if (navigator.vibrate) navigator.vibrate(200); } catch(e) {}
  }

  // Delay to next question
  setTimeout(() => {
    if (currentQuestionIndex.value < totalQuestions.value - 1) {
      currentQuestionIndex.value++;
      isAnswered.value = false;
      selectedOption.value = null;
    } else {
      showResult.value = true;
    }
  }, 800);
};

const triggerConfetti = () => {
  showConfetti.value = true;
  setTimeout(() => (showConfetti.value = false), 1500);
};

const restartQuiz = () => {
  console.log('[Quiz] restartQuiz called');
  showResult.value = false;
  currentQuestionIndex.value = 0;
  score.value = 0;
  isAnswered.value = false;
  selectedOption.value = null;
  showConfetti.value = false;
};

// --- NETLIFY FORMS: submission helpers ---
const userName = ref('')
const isSubmitting = ref(false)
const submitStatus = ref('')

const submitQuizResult = async () => {
  // Send to Netlify Forms by POSTing a urlencoded payload to '/'
  if (!userName.value) {
    submitStatus.value = 'Tolong isi nama terlebih dahulu.'
    return false
  }
  const payload = new URLSearchParams()
  payload.append('form-name', 'quiz-results')
  payload.append('name', userName.value)
  payload.append('quizId', route.params.id || '')
  payload.append('score', String(finalScore.value))
  payload.append('details', JSON.stringify({ scoreRaw: score.value, total: totalQuestions.value }))
  payload.append('date', new Date().toISOString())

  try {
    isSubmitting.value = true
    submitStatus.value = 'Menyimpan hasil...'
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString()
    })
    if (!res.ok) throw new Error('Network response not ok')
    submitStatus.value = 'Hasil tersimpan. Terima kasih!'
    return true
  } catch (e) {
    console.error('[Quiz] submit error', e)
    submitStatus.value = 'Gagal menyimpan hasil. Coba lagi nanti.'
    return false
  } finally {
    isSubmitting.value = false
  }
}

const finishQuiz = async () => {
  console.log('[Quiz] finishQuiz called');
  showConfetti.value = false;
  // attempt to save result; if saving fails we still navigate back but notify user
  const ok = await submitQuizResult()
  // small delay so user sees message in UI
  setTimeout(() => {
    router.back();
  }, 700)
};
</script>

<style scoped>
/* Custom Animations */
.animate-twinkle { animation: twinkle 3s infinite ease-in-out; }
@keyframes twinkle { 0%,100% { opacity:0.2; transform:scale(1); } 50% { opacity:1; transform:scale(1.5); } }

.animate-float { animation: float 3s ease-in-out infinite; }
@keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }

.animate-pop-in { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
@keyframes pop { 0% { transform:scale(0); opacity:0; } 100% { transform:scale(1); opacity:1; } }

.animate-confetti { animation: fall 1.5s linear forwards; }
@keyframes fall { 
  0% { transform:translateY(-10vh) rotate(0deg); opacity:1; } 
  100% { transform:translateY(110vh) rotate(720deg); opacity:0; } 
}

.animate-bounce-slow { animation: bounceSlow 3s infinite ease-in-out; }
@keyframes bounceSlow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

/* Vue Transitions */
.zoom-fade-enter-active, .zoom-fade-leave-active { transition: all 0.4s ease; }
.zoom-fade-enter-from { opacity: 0; transform: scale(0.95) translateY(20px); }
.zoom-fade-leave-to { opacity: 0; transform: scale(1.05); }
</style>