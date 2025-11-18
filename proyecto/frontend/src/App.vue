<script setup>
import Header from './components/Header.vue'
import HeroSection from './components/HeroSection.vue'
import CategoriesSection from './components/CategoriesSection.vue'
import Footer from './components/Footer.vue'
import FeaturedProducts from './components/FeaturedProducts.vue'
import Newsletter from './components/Newsletter.vue'
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header />
    <main class="flex-1">
      <HeroSection />
      <CategoriesSection />
      <FeaturedProducts />
      <Newsletter />
    </main>
    <Footer />
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
