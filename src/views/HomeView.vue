<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'

const router = useRouter()
const canvasRef = ref(null)
const isHolding = ref(false)
const energyLevel = ref(0)
const isLaunched = ref(false)
const decodedTitle = ref("SOLARIS")
const subTitle = ref("SYSTEM OFFLINE")

// --- EFEK DECODE TEXT ---
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&"
const hackEffect = (targetRef, originalText, speed = 30) => {
  let iterations = 0
  const interval = setInterval(() => {
    targetRef.value = originalText.split("")
      .map((letter, index) => {
        if(index < iterations) return originalText[index]
        return letters[Math.floor(Math.random() * letters.length)]
      })
      .join("")
    
    if(iterations >= originalText.length) clearInterval(interval)
    iterations += 1/3
  }, speed)
}

// --- CANVAS ENGINE (TUNNEL EFFECT) ---
let ctx, width, height, animationFrame
let particles = []

class TunnelParticle {
  constructor() {
    this.reset()
  }

  reset() {
    this.angle = Math.random() * Math.PI * 2 
    this.radius = 0 
    this.speed = Math.random() * 2 + 0.5
    this.size = Math.random() * 1.5 + 0.5
    this.color = this.getRandomColor()
    this.spinSpeed = (Math.random() - 0.5) * 0.02
  }

  getRandomColor() {
    return `hsl(${180 + Math.random() * 60}, 100%, 70%)` // Cyan/Blue
  }
  
  getWarpColor() {
    return `hsl(${280 + Math.random() * 60}, 100%, 80%)` // Purple/Pink/Red
  }

  update(acceleration) {
    this.radius += this.speed * acceleration
    this.angle += this.spinSpeed * acceleration * 2 
    this.radius += this.radius * 0.02 * acceleration

    const maxRadius = Math.max(width, height) / 1.5
    if (this.radius > maxRadius) {
      this.reset()
    }
  }

  draw() {
    const centerX = width / 2
    const centerY = height / 2
    const x = centerX + Math.cos(this.angle) * this.radius
    const y = centerY + Math.sin(this.angle) * this.radius
    
    const alpha = Math.min(this.radius / 200, 1)
    const currentSize = this.size + (this.radius / 100)

    ctx.beginPath()
    ctx.arc(x, y, currentSize, 0, Math.PI * 2)
    
    ctx.fillStyle = isHolding.value ? this.getWarpColor() : this.color
    ctx.globalAlpha = alpha
    ctx.fill()
    ctx.globalAlpha = 1
    
    if (isHolding.value) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      const trailX = centerX + Math.cos(this.angle) * (this.radius - 40)
      const trailY = centerY + Math.sin(this.angle) * (this.radius - 40)
      ctx.lineTo(trailX, trailY)
      ctx.strokeStyle = ctx.fillStyle
      ctx.lineWidth = currentSize
      ctx.stroke()
    }
  }
}

const initCanvas = () => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = width
  canvas.height = height
  
  particles = []
  for (let i = 0; i < 600; i++) { 
    particles.push(new TunnelParticle())
  }
}

const animate = () => {
  if (!ctx) return
  ctx.fillStyle = `rgba(0, 0, 0, ${isHolding.value ? 0.1 : 0.3})`
  ctx.fillRect(0, 0, width, height)
  
  let accel = 1
  if (isHolding.value) {
    accel = 5 + (energyLevel.value / 10) 
  } else if (energyLevel.value > 0) {
    energyLevel.value -= 2 
  }

  particles.forEach(p => {
    p.update(accel)
    p.draw()
  })

  if (isHolding.value && !isLaunched.value) {
    energyLevel.value += 0.5
    if (energyLevel.value >= 100) triggerJump()
  }

  animationFrame = requestAnimationFrame(animate)
}

const triggerJump = () => {
  isLaunched.value = true
  isHolding.value = true 
  subTitle.value = "HYPERDRIVE ENGAGED"
  
  setTimeout(() => {
    // PERUBAHAN DI SINI: Arahkan ke /selection, bukan /explore
    router.push('/selection') 
  }, 500) 
}

const startCharge = () => {
  if (isLaunched.value) return
  isHolding.value = true
  subTitle.value = "CHARGING..."
  hackEffect(subTitle, "SPOOLING DRIVE...")
}

const stopCharge = () => {
  if (isLaunched.value) return
  isHolding.value = false
  subTitle.value = "SYSTEM READY"
}

onMounted(() => {
  initCanvas()
  animate()
  window.addEventListener('resize', initCanvas)
  
  setTimeout(() => hackEffect(decodedTitle, "SOLARIS"), 500)
  setTimeout(() => hackEffect(subTitle, "SYSTEM READY"), 1000)
})

onUnmounted(() => {
  window.removeEventListener('resize', initCanvas)
  cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <div class="relative w-full h-full bg-black overflow-hidden select-none font-mono pointer-events-auto"
       @mousedown="startCharge" 
       @mouseup="stopCharge"
       @mouseleave="stopCharge"
       @touchstart.prevent="startCharge"
       @touchend="stopCharge">

    <div class="absolute inset-0 transition-transform duration-75"
         :style="isHolding ? `transform: translate(${(Math.random()-0.5)*10}px, ${(Math.random()-0.5)*10}px)` : ''">
      
      <canvas ref="canvasRef" class="absolute inset-0 z-0"></canvas>
    </div>

    <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] z-10 pointer-events-none"></div>
    <div class="absolute inset-0 z-10 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

    <div class="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
      
      <div class="relative w-64 h-64 flex items-center justify-center transition-all duration-300"
           :class="{ 'scale-125': isHolding }">
        
        <div class="absolute inset-0 border border-cyan-500/30 rounded-full animate-spin-slow"></div>
        <div class="absolute inset-4 border border-dashed border-cyan-500/20 rounded-full animate-reverse-spin"></div>
        
        <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-b-purple-500 blur-sm transition-transform duration-100"
             :style="`transform: rotate(${energyLevel * 10}deg)`"></div>

        <div class="relative z-30 text-center mix-blend-overlay">
          <h1 class="text-6xl md:text-8xl font-[Orbitron] font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
            {{ decodedTitle }}
          </h1>
        </div>

        <div class="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl transition-all duration-500"
             :class="isHolding ? 'opacity-100 scale-150 bg-purple-500/40' : 'opacity-0 scale-50'"></div>
      </div>

      <div class="mt-12 flex flex-col items-center space-y-2">
        <p class="font-[Rajdhani] text-cyan-400 tracking-[0.5em] text-xs uppercase transition-colors duration-300"
           :class="{ 'text-purple-400 font-bold shake-text': isHolding }">
          {{ subTitle }}
        </p>
        
        <div class="w-48 h-[2px] bg-gray-800 rounded-full overflow-hidden relative">
          <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-75 ease-out"
               :style="`width: ${energyLevel}%`"></div>
        </div>
        
        <p class="text-[10px] text-gray-500 font-[Rajdhani] mt-2 animate-pulse">
          CLICK & HOLD TO INITIALIZE JUMP
        </p>
      </div>

    </div>

    <div class="absolute inset-0 bg-white pointer-events-none z-50 transition-opacity duration-300 ease-in"
         :class="isLaunched ? 'opacity-100' : 'opacity-0'"></div>
         
    <div class="absolute top-0 left-0 p-8 opacity-50 hidden md:block pointer-events-none">
      <div class="w-4 h-4 border-t-2 border-l-2 border-white"></div>
    </div>
    <div class="absolute bottom-0 right-0 p-8 opacity-50 hidden md:block pointer-events-none">
      <div class="w-4 h-4 border-b-2 border-r-2 border-white"></div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&family=Rajdhani:wght@500;700&display=swap');

@keyframes spin-slow {
  to { transform: rotate(360deg); }
}
.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

@keyframes reverse-spin {
  to { transform: rotate(-360deg); }
}
.animate-reverse-spin {
  animation: reverse-spin 15s linear infinite;
}

.shake-text {
  animation: shake 0.5s infinite;
}

@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
}
</style>