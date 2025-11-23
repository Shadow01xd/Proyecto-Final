<script setup>
import Header from '@/components/Header.vue'
import HeroSection from '@/components/HeroSection.vue'
import CategoriesSection from '@/components/CategoriesSection.vue'
import FeaturedProducts from '@/components/FeaturedProducts.vue'
import Newsletter from '@/components/Newsletter.vue'
import Footer from '@/components/Footer.vue'
import { ref } from 'vue'

const cartCount = ref(0)
const lastAddedProduct = ref(null)
const showCartAlert = ref(false)

const handleAddToCart = (product) => {
  cartCount.value++
  lastAddedProduct.value = product
  showCartAlert.value = true
  setTimeout(() => {
    showCartAlert.value = false
  }, 2000)
}
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
