// src/composables/useThreeScene.js
import { ref, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

/**
 * Composable untuk setup dan cleanup Three.js scene
 * Digunakan oleh EventsView, ExploreView, dan PlanetDetail
 */
export function useThreeScene() {
  const scene = ref(null)
  const camera = ref(null)
  const renderer = ref(null)
  const controls = ref(null)
  const composer = ref(null)
  const container = ref(null)

  /**
   * Initialize Three.js scene dengan konfigurasi
   * @param {HTMLElement} containerElement - DOM element untuk canvas
   * @param {Object} options - Konfigurasi scene
   * @param {boolean} options.enableBloom - Aktifkan post-processing bloom
   * @param {Object} options.backgroundColor - Warna background scene
   * @param {boolean} options.enableFog - Aktifkan fog
   * @param {Object} options.cameraPosition - Posisi awal kamera {x, y, z}
   * @param {boolean} options.enableShadows - Aktifkan shadows
   * @param {boolean} options.alpha - Transparent renderer (untuk AR)
   */
  const initScene = (containerElement, options = {}) => {
    const {
      enableBloom = true,
      backgroundColor = 0x020205,
      enableFog = false,
      cameraPosition = { x: 0, y: 200, z: 300 },
      enableShadows = true,
      alpha = true,
      antialias = true
    } = options

    container.value = containerElement
    const w = containerElement.clientWidth || window.innerWidth
    const h = containerElement.clientHeight || window.innerHeight

    // Scene Setup
    scene.value = new THREE.Scene()
    scene.value.background = new THREE.Color(backgroundColor)
    if (enableFog) {
      scene.value.fog = new THREE.FogExp2(backgroundColor, 0.002)
    }

    // Camera Setup
    camera.value = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
    camera.value.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)

    // Renderer Setup
    renderer.value = new THREE.WebGLRenderer({
      antialias,
      alpha
    })
    renderer.value.setSize(w, h)
    renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    if (enableShadows) {
      renderer.value.shadowMap.enabled = true
    }
    
    // Encoding untuk warna yang lebih baik
    if (renderer.value.outputEncoding !== undefined) {
      renderer.value.outputEncoding = THREE.sRGBEncoding
    } else if (renderer.value.outputColorSpace !== undefined) {
      renderer.value.outputColorSpace = THREE.SRGBColorSpace
    }
    
    renderer.value.toneMapping = THREE.ACESFilmicToneMapping

    // Append to container
    containerElement.appendChild(renderer.value.domElement)

    // Controls Setup
    controls.value = new OrbitControls(camera.value, renderer.value.domElement)
    controls.value.enableDamping = true
    controls.value.dampingFactor = 0.05

    // Post-processing (Bloom)
    if (enableBloom) {
      const renderPass = new RenderPass(scene.value, camera.value)
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        1.0, // strength
        0.4, // radius
        0.85 // threshold
      )

      composer.value = new EffectComposer(renderer.value)
      composer.value.addPass(renderPass)
      composer.value.addPass(bloomPass)
    }

    // Resize handler
    const handleResize = () => {
      if (!camera.value || !renderer.value || !container.value) return
      
      const newW = container.value.clientWidth || window.innerWidth
      const newH = container.value.clientHeight || window.innerHeight
      
      camera.value.aspect = newW / newH
      camera.value.updateProjectionMatrix()
      renderer.value.setSize(newW, newH)
      
      if (composer.value) {
        composer.value.setSize(newW, newH)
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup function untuk resize listener
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    return {
      scene: scene.value,
      camera: camera.value,
      renderer: renderer.value,
      controls: controls.value,
      composer: composer.value
    }
  }

  /**
   * Render scene - gunakan di animation loop
   * @param {boolean} useComposer - Gunakan composer (bloom) atau renderer biasa
   */
  const render = (useComposer = true) => {
    if (!scene.value || !camera.value || !renderer.value) return

    if (useComposer && composer.value) {
      composer.value.render()
    } else {
      renderer.value.render(scene.value, camera.value)
    }
  }

  /**
   * Update controls - panggil di animation loop
   */
  const updateControls = () => {
    if (controls.value) {
      controls.value.update()
    }
  }

  /**
   * Cleanup semua resources Three.js
   * PENTING: Panggil ini di onUnmounted untuk mencegah memory leak
   */
  const cleanup = () => {
    // Dispose controls
    if (controls.value) {
      controls.value.dispose()
      controls.value = null
    }

    // Dispose renderer
    if (renderer.value) {
      renderer.value.dispose()
      
      // Remove canvas dari DOM
      if (renderer.value.domElement && renderer.value.domElement.parentNode) {
        renderer.value.domElement.parentNode.removeChild(renderer.value.domElement)
      }
      
      renderer.value = null
    }

    // Dispose composer
    if (composer.value) {
      composer.value = null
    }

    // Traverse scene dan dispose semua geometries, materials, textures
    if (scene.value) {
      scene.value.traverse((object) => {
        // Dispose geometry
        if (object.geometry) {
          object.geometry.dispose()
        }

        // Dispose material(s)
        if (object.material) {
          // Handle array of materials
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => {
              disposeMaterial(material)
            })
          } else {
            disposeMaterial(object.material)
          }
        }
      })

      scene.value.clear()
      scene.value = null
    }

    camera.value = null
    container.value = null
  }

  /**
   * Helper untuk dispose material dan textures
   * @param {THREE.Material} material 
   */
  const disposeMaterial = (material) => {
    // Dispose textures
    const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'lightMap', 'bumpMap', 'displacementMap']
    
    textureProperties.forEach((prop) => {
      if (material[prop] && material[prop].dispose) {
        material[prop].dispose()
      }
    })

    material.dispose()
  }

  // Auto cleanup on component unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    scene,
    camera,
    renderer,
    controls,
    composer,
    initScene,
    render,
    updateControls,
    cleanup
  }
}
