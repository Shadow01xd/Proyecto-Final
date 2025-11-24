<script setup>
import Header from '@/components/Header.vue'
import HeroSection from '@/components/HeroSection.vue'
import CategoriesSection from '@/components/CategoriesSection.vue'
import FeaturedProducts from '@/components/FeaturedProducts.vue'
import Newsletter from '@/components/Newsletter.vue'
import Footer from '@/components/Footer.vue'
import { ref, onMounted } from 'vue'

const cartCount = ref(0)
const lastAddedProduct = ref(null)
const showCartAlert = ref(false)

function getUserId() {
  try {
    const raw = localStorage.getItem('usuario')
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.idUsuario || null
  } catch {
    return null
  }
}

const handleAddToCart = (product) => {
  const uid = getUserId()
  const key = uid ? `cart_${uid}` : 'cart'
  if (uid) {
    // Persistir en backend
    fetch('http://localhost:3000/api/carrito/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario: uid, idProducto: product.id, cantidad: 1 })
    })
      .then(() => fetch(`http://localhost:3000/api/carrito/${uid}`))
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        cartCount.value = (data.items || []).length
      })
      .catch(() => {
        // fallback visual si falla backend
        cartCount.value++
      })
  } else {
    // Invitado -> localStorage
    try {
      const raw = localStorage.getItem(key)
      const items = raw ? JSON.parse(raw) : []
      items.push(product)
      localStorage.setItem(key, JSON.stringify(items))
      cartCount.value = items.length
    } catch {
      cartCount.value++
    }
  }
  lastAddedProduct.value = product
  showCartAlert.value = true
  setTimeout(() => {
    showCartAlert.value = false
  }, 2000)
}

onMounted(async () => {
  const uid = getUserId()
  const key = uid ? `cart_${uid}` : 'cart'
  if (uid) {
    try {
      const res = await fetch(`http://localhost:3000/api/carrito/${uid}`)
      if (res.ok) {
        const data = await res.json()
        cartCount.value = (data.items || []).length
        return
      }
    } catch {}
  }
  try {
    const raw = localStorage.getItem(key)
    const items = raw ? JSON.parse(raw) : []
    cartCount.value = items.length
  } catch {
    cartCount.value = 0
  }
})
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header :cart-count="cartCount" />
    <main class="flex-1">
      <HeroSection />
      <CategoriesSection />
      <FeaturedProducts @add-to-cart="handleAddToCart" />
      <Newsletter />
    </main>
    <Footer />

    <transition name="fade">
      <div
        v-if="showCartAlert && lastAddedProduct"
        class="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded shadow-lg text-sm"
      >
        {{ lastAddedProduct.name }} agregado al carrito
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
