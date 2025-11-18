<script setup>
import { ref, onMounted } from 'vue'

const isMenuOpen = ref(false)
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const isDark = ref(false)
const applyTheme = (dark) => {
  const root = document.documentElement
  if (dark) {
    root.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    root.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') {
    isDark.value = saved === 'dark'
  } else {
    isDark.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme(isDark.value)
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  applyTheme(isDark.value)
}
</script>

  <template>
  <header class="sticky top-0 z-50 border-b border-border bg-background text-foreground shadow-sm">
    <div class="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        <!-- Brand -->
        <div class="flex-shrink-0">
          <h1 class="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">NovaTech</h1>
        </div>

        <!-- Desktop nav -->
        <nav class="hidden md:flex gap-10">
          <a href="#" class="text-base font-medium text-foreground hover:text-primary transition-colors">Hardware</a>
          <a href="#" class="text-base font-medium text-foreground hover:text-primary transition-colors">Periféricos</a>
          <a href="#" class="text-base font-medium text-foreground hover:text-primary transition-colors">Gaming</a>
          <a href="#" class="text-base font-medium text-foreground hover:text-primary transition-colors">Ofertas</a>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-5">
          <button class="p-2.5 hover:bg-secondary rounded-lg transition-colors text-foreground" aria-label="Buscar">
            <!-- Search icon -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          <button class="p-2.5 hover:bg-secondary rounded-lg transition-colors relative text-foreground" aria-label="Carrito">
            <!-- Cart icon -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2h2l2.76 12.74A2 2 0 0 0 8.75 16h8.75a2 2 0 0 0 2-1.64L21.95 6H5.12"/></svg>
            <span class="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full"></span>
          </button>
          <button class="p-2.5 hover:bg-secondary rounded-lg transition-colors text-foreground" :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'" @click="toggleTheme">
            <!-- Theme icon: moon for light, sun for dark -->
            <svg v-if="!isDark" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg v-else class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          </button>
          <button class="md:hidden p-2" @click="toggleMenu" aria-label="Abrir menú">
            <svg v-if="!isMenuOpen" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            <svg v-else class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Mobile nav -->
      <nav v-if="isMenuOpen" class="md:hidden py-4 space-y-2 border-t border-border">
        <a href="#" class="block px-2 py-2 text-foreground hover:text-primary transition-colors">Hardware</a>
        <a href="#" class="block px-2 py-2 text-foreground hover:text-primary transition-colors">Periféricos</a>
        <a href="#" class="block px-2 py-2 text-foreground hover:text-primary transition-colors">Gaming</a>
        <a href="#" class="block px-2 py-2 text-foreground hover:text-primary transition-colors">Ofertas</a>
      </nav>
    </div>
  </header>
</template>

<style scoped>
</style>
