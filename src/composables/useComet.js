// src/composables/useComet.js
import * as THREE from 'three'

/**
 * Composable untuk simulasi hujan komet
 * Digunakan khusus untuk EventsView scene "comet-shower"
 */
export function useComet() {

    /**
     * Buat hujan komet dengan jumlah tertentu
     * @param {THREE.Scene} scene - Three.js scene
     * @param {THREE.Group} cometGroup - Group untuk menampung comet meshes
     * @param {number} count - Jumlah komet
     * @param {boolean} initial - Apakah ini setup awal (posisi random di viewport)
     */
    const createCometShower = (scene, cometGroup, count = 20, initial = false) => {
        // Clear existing comets
        while (cometGroup.children.length > 0) {
            const comet = cometGroup.children[0]
            cometGroup.remove(comet)

            // Dispose geometry dan material
            if (comet.geometry) comet.geometry.dispose()
            if (comet.material) comet.material.dispose()

            // Dispose tail jika ada
            comet.children.forEach(child => {
                if (child.geometry) child.geometry.dispose()
                if (child.material) child.material.dispose()
            })
        }

        // Buat komet baru
        for (let i = 0; i < count; i++) {
            const cometSize = 0.1 + Math.random() * 0.15

            // Head (kepala komet)
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(cometSize, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xaaddff })
            )

            // Tail (ekor komet)
            const tailLength = 6 + Math.random() * 5
            const tail = new THREE.Mesh(
                new THREE.ConeGeometry(cometSize, tailLength, 16, 1, true),
                new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.3,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                })
            )

            tail.rotation.x = Math.PI / 2
            tail.position.z = tailLength / 2
            head.add(tail)

            // Set posisi awal
            resetComet(head, initial)

            cometGroup.add(head)
        }
    }

    /**
     * Reset posisi komet ke posisi awal
     * @param {THREE.Mesh} comet - Mesh komet
     * @param {boolean} initial - Jika true, spawn di viewport; jika false, spawn di kanan (off-screen)
     */
    const resetComet = (comet, initial = false) => {
        if (initial) {
            // Posisi random di viewport (untuk setup awal)
            comet.position.set(
                -20 + Math.random() * 70,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15
            )
        } else {
            // Posisi di kanan layar (respawn setelah keluar viewport)
            comet.position.set(
                50 + Math.random() * 30,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15
            )
        }

        // Set kecepatan random
        comet.userData = {
            speed: 0.5 + Math.random() * 0.8
        }

        // Rotasi random agar lebih natural
        comet.rotation.z = (Math.random() - 0.5) * 0.5
    }

    /**
     * Update posisi semua komet (panggil di animation loop)
     * @param {THREE.Group} cometGroup - Group berisi semua komet
     * @param {number} deltaTime - Delta time dari clock
     */
    const updateComets = (cometGroup, deltaTime) => {
        if (!cometGroup || cometGroup.children.length === 0) return

        cometGroup.children.forEach((comet) => {
            // Gerakkan komet ke kiri
            const speed = comet.userData.speed || 0.6
            comet.position.x -= speed * deltaTime * 20

            // Reset jika sudah keluar viewport
            if (comet.position.x < -80) {
                resetComet(comet, false)
            }
        })
    }

    return {
        createCometShower,
        resetComet,
        updateComets
    }
}
