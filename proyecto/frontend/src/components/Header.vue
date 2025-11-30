<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  cartCount: {
    type: Number,
    default: 0
  }
})

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

// Estado del usuario
const usuario = ref(null)
const isLoggedIn = ref(false)

const loadUser = () => {
  const userData = localStorage.getItem('usuario')
  if (userData) {
    try {
      usuario.value = JSON.parse(userData)
      isLoggedIn.value = true
    } catch (e) {
      console.error('Error al parsear datos del usuario:', e)
      localStorage.removeItem('usuario')
      usuario.value = null
      isLoggedIn.value = false
    }
  } else {
    usuario.value = null
    isLoggedIn.value = false
  }
  // Actualizar flags de rol tras cargar usuario
  updateRoleFlags()
}

const logout = () => {
  // limpiar carrito del usuario actual (clave por usuario y legacy)
  try {
    const u = usuario.value || JSON.parse(localStorage.getItem('usuario') || 'null')
    if (u && u.idUsuario) {
      localStorage.removeItem(`cart_${u.idUsuario}`)
    }
    localStorage.removeItem('cart')
  } catch {}
  localStorage.removeItem('usuario')
  usuario.value = null
  isLoggedIn.value = false
  isUserMenuOpen.value = false
  // resetear flags de rol para ocultar "Dashboard" de inmediato
  isStaff.value = false
  // recargar completamente la página para limpiar cualquier estado en memoria
  window.location.href = '/'
}

onMounted(() => {
  // Cargar tema
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') {
    isDark.value = saved === 'dark'
  } else {
    isDark.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme(isDark.value)

  // Cargar usuario
  loadUser()
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  applyTheme(isDark.value)
}

const isUserMenuOpen = ref(false)
const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

// Roles con acceso a Dashboard
const isStaff = ref(false)
const updateRoleFlags = () => {
  const rol = (usuario.value?.nombreRol || '').toUpperCase()
  isStaff.value = rol === 'ADMIN' || rol === 'ADMINISTRADOR' || rol === 'EMPLEADO'
}
</script>

  <template>
  <header class="sticky top-0 z-50 border-b border-border bg-background text-foreground shadow-sm">
    <div class="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
      <div class="flex items-center h-20">
        <!-- Brand -->
        <RouterLink to="/" class="flex-shrink-0" aria-label="Ir al inicio">
          <h1 class="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">NovaTech</h1>
        </RouterLink>

        <!-- Desktop nav -->
        <nav class="hidden md:flex gap-10 mx-auto">
          <RouterLink to="/" class="text-base font-medium text-foreground hover:text-primary transition-colors">Inicio</RouterLink>
          <RouterLink to="/hardware" class="text-base font-medium text-foreground hover:text-primary transition-colors">Catálogo</RouterLink>
          <RouterLink to="/builder" class="text-base font-medium text-foreground hover:text-primary transition-colors">Arma tu PC</RouterLink>
          <a href="#" class="text-base font-medium text-foreground hover:text-primary transition-colors">Ofertas</a>
          <RouterLink to="/about" class="text-base font-medium text-foreground hover:text-primary transition-colors">Sobre nosotros</RouterLink>
          <RouterLink v-if="isStaff" to="/dashboard" class="text-base font-medium text-foreground hover:text-primary transition-colors">Administrar</RouterLink>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2 ml-auto">
          <!-- Search (hidden on mobile) -->
          <button class="hidden md:block p-2.5 hover:bg-secondary rounded-lg transition-colors text-foreground" aria-label="Buscar">
            <!-- Search icon -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>

          <!-- Cart (always visible) -->
          <RouterLink to="/carrito" class="p-2.5 hover:bg-secondary rounded-lg transition-colors relative text-foreground" aria-label="Ir al carrito">
            <!-- Cart icon -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2h2l2.76 12.74A2 2 0 0 0 8.75 16h8.75a2 2 0 0 0 2-1.64L21.95 6H5.12"/></svg>
            <span
              v-if="props.cartCount > 0"
              class="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-primary text-primary-foreground text-[0.65rem] rounded-full flex items-center justify-center px-1"
            >
              {{ props.cartCount }}
            </span>
          </RouterLink>

          <!-- User menu (hidden on mobile) -->
          <div class="relative hidden md:inline-flex">
            <button
              class="p-2.5 hover:bg-secondary rounded-lg transition-colors text-foreground flex items-center gap-2"
              aria-label="Usuario"
              @click="toggleUserMenu"
            >
              <!-- User icon -->
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <!-- Mostrar nombre si está logueado -->
              <span v-if="isLoggedIn" class="text-sm font-medium">{{ usuario.nombreUsuario }}</span>
            </button>

            <!-- User menu dropdown (desktop) -->
            <transition name="fade">
              <div
                v-if="isUserMenuOpen"
                class="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-background shadow-lg py-1 text-sm z-50"
              >
                <!-- Si NO está logueado -->
                <template v-if="!isLoggedIn">
                  <RouterLink
                    to="/login"
                    class="block px-3 py-2 hover:bg-secondary text-foreground"
                    @click="isUserMenuOpen = false"
                  >
                    Iniciar sesión
                  </RouterLink>
                  <RouterLink
                    to="/register"
                    class="block px-3 py-2 hover:bg-secondary text-foreground"
                    @click="isUserMenuOpen = false"
                  >
                    Registrarse
                  </RouterLink>
                </template>

                <!-- Si SÍ está logueado -->
                <template v-else>
                  <div class="px-3 py-2 border-b border-border">
                    <p class="text-xs text-muted-foreground">Conectado como</p>
                    <p class="font-semibold truncate">{{ usuario.nombreUsuario }} {{ usuario.apellidoUsuario }}</p>
                    <p class="text-xs text-muted-foreground truncate">{{ usuario.emailUsuario }}</p>
                  </div>
                  <RouterLink
                    to="/profile"
                    class="block px-3 py-2 hover:bg-secondary text-foreground"
                    @click="isUserMenuOpen = false"
                  >
                    Mi perfil
                  </RouterLink>
                  <RouterLink
                    to="/my-orders"
                    class="block px-3 py-2 hover:bg-secondary text-foreground"
                    @click="isUserMenuOpen = false"
                  >
                    Mis pedidos
                  </RouterLink>
                  <div class="h-px bg-border my-1"></div>
                  <button
                    @click="logout"
                    class="w-full text-left px-3 py-2 hover:bg-secondary text-red-500 hover:text-red-600"
                  >
                    Cerrar sesión
                  </button>
                </template>
              </div>
            </transition>
          </div>

          <!-- Theme toggle (hidden on mobile) -->
          <button class="hidden md:block p-2.5 hover:bg-secondary rounded-lg transition-colors text-foreground" :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'" @click="toggleTheme">
            <!-- Theme icon: moon for light, sun for dark -->
            <svg v-if="!isDark" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg v-else class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          </button>

          <!-- Mobile menu toggle -->
          <button class="md:hidden p-2.5 hover:bg-secondary rounded-lg transition-colors text-foreground" @click="toggleMenu" aria-label="Abrir menú">
            <svg v-if="!isMenuOpen" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            <svg v-else class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Mobile nav -->
      <transition name="slide-down">
        <nav v-if="isMenuOpen" class="md:hidden py-4 space-y-1 border-t border-border">
          <!-- Navigation links -->
          <RouterLink
            to="/"
            class="block px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
            @click="isMenuOpen = false"
          >
            Inicio
          </RouterLink>
          <RouterLink
            v-if="isStaff"
            to="/dashboard"
            class="block px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
            @click="isMenuOpen = false"
          >
            Administrar
          </RouterLink>
          <RouterLink
            to="/hardware"
            class="block px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
            @click="isMenuOpen = false"
          >
            Catálogo
          </RouterLink>
          <RouterLink
            to="/builder"
            class="block px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
            @click="isMenuOpen = false"
          >
            Arma tu PC
          </RouterLink>
          <a
            href="#"
            class="block px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
            @click="isMenuOpen = false"
          >
            Ofertas
          </a>
          <RouterLink
            to="/about"
            class="block px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
            @click="isMenuOpen = false"
          >
            Sobre nosotros
          </RouterLink>

          <!-- Divider -->
          <div class="h-px bg-border my-2"></div>

          <!-- User options -->
          <div class="space-y-1">
            <!-- Si NO está logueado -->
            <template v-if="!isLoggedIn">
              <RouterLink
                to="/login"
                class="flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
                @click="isMenuOpen = false"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
                Iniciar sesión
              </RouterLink>
              <RouterLink
                to="/register"
                class="flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
                @click="isMenuOpen = false"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                Registrarse
              </RouterLink>
            </template>

            <!-- Si SÍ está logueado -->
            <template v-else>
              <div class="px-4 py-2.5 bg-secondary/50 rounded-md">
                <p class="text-xs text-muted-foreground">Conectado como</p>
                <p class="font-semibold">{{ usuario.nombreUsuario }} {{ usuario.apellidoUsuario }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ usuario.emailUsuario }}</p>
              </div>
              <RouterLink
                to="/profile"
                class="flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
                @click="isMenuOpen = false"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Mi perfil
              </RouterLink>
              <RouterLink
                to="/my-orders"
                class="flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
                @click="isMenuOpen = false"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>
                Mis pedidos
              </RouterLink>
              <button
                @click="logout"
                class="flex items-center gap-3 w-full px-4 py-2.5 text-red-500 hover:bg-secondary hover:text-red-600 transition-colors rounded-md"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                Cerrar sesión
              </button>
            </template>
          </div>

          <!-- Divider -->
          <div class="h-px bg-border my-2"></div>

          <!-- Theme toggle for mobile -->
          <button
            class="flex items-center gap-3 w-full px-4 py-2.5 text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
            @click="toggleTheme"
          >
            <svg v-if="!isDark" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            {{ isDark ? 'Modo claro' : 'Modo oscuro' }}
          </button>
        </nav>
      </transition>
    </div>
  </header>
</template>

<style scoped>
/* Fade transition for user menu */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide down transition for mobile menu */
.slide-down-enter-active {
  transition: all 0.3s ease-out;
}

.slide-down-leave-active {
  transition: all 0.2s ease-in;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
