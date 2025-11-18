<script setup>
const categories = [
  { name: 'Procesadores', count: '45 productos', icon: '⚡', color: 'from-blue-500/20 to-cyan-500/20' },
  { name: 'Tarjetas Gráficas', count: '38 productos', icon: '🎮', color: 'from-purple-500/20 to-pink-500/20' },
  { name: 'Almacenamiento', count: '62 productos', icon: '💾', color: 'from-orange-500/20 to-red-500/20' },
  { name: 'Refrigeración', count: '28 productos', icon: '❄️', color: 'from-cyan-500/20 to-blue-500/20' },
  { name: 'Fuentes de Poder', count: '34 productos', icon: '🔌', color: 'from-yellow-500/20 to-orange-500/20' },
  { name: 'Periféricos', count: '71 productos', icon: '🖱️', color: 'from-green-500/20 to-emerald-500/20' },
]
</script>

<template>
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
    <div class="space-y-12">
      <div class="space-y-4">
        <h2 class="text-3xl md:text-4xl font-bold text-foreground">Categorías</h2>
        <p class="text-lg text-muted-foreground">Encuentra exactamente lo que necesitas</p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          v-for="cat in categories"
          :key="cat.name"
          class="group relative overflow-hidden rounded-lg bg-card border border-border p-6 hover:border-primary transition-all duration-300 text-left"
        >
          <div :class="['absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300', cat.color, 'dark:from-red-500/20 dark:to-rose-600/20']"></div>
          <div class="relative space-y-3">
            <div class="text-4xl">{{ cat.icon }}</div>
            <div>
              <h3 class="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{{ cat.name }}</h3>
              <p class="text-sm text-muted-foreground">{{ cat.count }}</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>
