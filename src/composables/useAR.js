// src/composables/useAR.js
import { ref, onUnmounted } from 'vue'
import * as THREE from 'three'

/**
 * Composable untuk AR Mode (Augmented Reality)
 * Menggunakan getUserMedia untuk akses kamera device
 */
export function useAR() {
    const isARMode = ref(false)
    const cameraError = ref(null)
    const stream = ref(null)

    /**
     * Toggle AR Mode
     * @param {HTMLVideoElement} videoElement - Video element untuk stream kamera
     * @param {THREE.Scene} scene - Three.js scene
     * @param {THREE.Points|null} starSystem - Star system mesh (akan di-hide saat AR aktif)
     * @returns {Promise<boolean>} - True jika sukses, false jika gagal
     */
    const toggleAR = async (videoElement, scene, starSystem = null) => {
        if (!isARMode.value) {
            // Aktifkan AR
            try {
                const constraints = {
                    video: {
                        facingMode: 'environment', // Kamera belakang
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                }

                stream.value = await navigator.mediaDevices.getUserMedia(constraints)

                if (videoElement) {
                    videoElement.srcObject = stream.value

                    // Tunggu video ready
                    videoElement.onloadedmetadata = () => {
                        videoElement.play()
                        isARMode.value = true

                        // Transparan-kan background scene
                        if (scene) {
                            scene.background = null
                            if (scene.fog) scene.fog = null
                        }

                        // Sembunyikan bintang
                        if (starSystem) {
                            starSystem.visible = false
                        }
                    }

                    cameraError.value = null
                    return true
                }
            } catch (err) {
                console.error('AR Camera Error:', err)
                cameraError.value = 'Gagal akses kamera. Pastikan HTTPS & Izin Kamera diaktifkan.'
                return false
            }
        } else {
            // Matikan AR
            stopAR(videoElement, scene, starSystem)
            return true
        }
    }

    /**
     * Stop AR Mode dan kembalikan ke mode normal
     * @param {HTMLVideoElement} videoElement - Video element
     * @param {THREE.Scene} scene - Three.js scene
     * @param {THREE.Points|null} starSystem - Star system mesh
     * @param {number} backgroundColor - Warna background default (hex)
     */
    const stopAR = (videoElement, scene, starSystem = null, backgroundColor = 0x020205) => {
        // Stop stream
        if (stream.value) {
            stream.value.getTracks().forEach((track) => track.stop())
            stream.value = null
        }

        // Clear video element
        if (videoElement) {
            videoElement.srcObject = null
        }

        // Kembalikan background scene
        if (scene) {
            scene.background = new THREE.Color(backgroundColor)
        }

        // Munculkan bintang kembali
        if (starSystem) {
            starSystem.visible = true
        }

        isARMode.value = false
        cameraError.value = null
    }

    /**
     * Auto cleanup saat component unmount
     */
    onUnmounted(() => {
        if (stream.value) {
            stream.value.getTracks().forEach((track) => track.stop())
            stream.value = null
        }
    })

    return {
        isARMode,
        cameraError,
        toggleAR,
        stopAR
    }
}
