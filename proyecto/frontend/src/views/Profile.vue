<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const router = useRouter()

const usuario = ref(null)
const isEditing = ref(false)

// Newsletter
const newsletterSubscribed = ref(false)

// Formulario
const form = ref({
  nombreUsuario: '',
  apellidoUsuario: '',
  emailUsuario: '',
  telefonoUsuario: '',
  direccionUsuario: ''
})

// Para cambiar contraseña
const showPasswordForm = ref(false)
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')
const success = ref('')

// Cart badge
const cartCount = ref(0)
function getUserId() {
  try {
    const raw = localStorage.getItem('usuario')
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.idUsuario || null
  } catch { return null }
}
async function loadCartCount() {
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
  } catch { cartCount.value = 0 }
}

// Métodos de pago
const paymentMethods = ref([])
const methodsLoading = ref(false)
const methodsError = ref('')
const editingMethodId = ref(null)
const editMethodForm = ref({ aliasTarjeta: '', titularTarjeta: '', esPredeterminado: false, cardNumber: '', expMonth: '', expYear: '', cvv: '' })

async function loadPaymentMethods(){
  if (!usuario.value) return
  methodsLoading.value = true
  methodsError.value = ''
  const uid = usuario.value.idUsuario
  try {
    const r = await fetch(`http://localhost:3000/api/payments/methods/user/${uid}`)
    const d = await r.json()
    const backend = Array.isArray(d.methods) ? d.methods : []
    paymentMethods.value = backend
  } catch {
    paymentMethods.value = []
  } finally {
    methodsLoading.value = false
  }
}
function startEditMethod(m){
  editingMethodId.value = m.idMetodoPagoUsuario
  editMethodForm.value = {
    aliasTarjeta: m.aliasTarjeta || '',
    titularTarjeta: m.titularTarjeta || '',
    esPredeterminado: !!m.esPredeterminado,
    cardNumber: '',
    expMonth: m.mesExpiracion != null ? String(m.mesExpiracion) : '',
    expYear: m.anioExpiracion != null ? String(m.anioExpiracion) : '',
    cvv: ''
  }
}
function cancelEditMethod(){
  editingMethodId.value = null
  editMethodForm.value = { aliasTarjeta: '', titularTarjeta: '', esPredeterminado: false, cardNumber: '', expMonth: '', expYear: '', cvv: '' }
}
async function saveMethodChanges(m){
  try{
    methodsLoading.value = true
    const uid = usuario.value?.idUsuario
    const cleanedNumber = (editMethodForm.value.cardNumber || '').toString().replace(/\s+/g,'')
    const resp = await fetch(`http://localhost:3000/api/payments/methods/${m.idMetodoPagoUsuario}`,{
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        aliasTarjeta: editMethodForm.value.aliasTarjeta,
        titularTarjeta: editMethodForm.value.titularTarjeta,
        esPredeterminado: !!editMethodForm.value.esPredeterminado,
        idUsuario: uid,
        cardNumber: cleanedNumber,
        expMonth: editMethodForm.value.expMonth,
        expYear: editMethodForm.value.expYear,
        cvv: editMethodForm.value.cvv
      })
    })
    const data = await resp.json()
    if(!resp.ok){ throw new Error(data.error||'Error al actualizar método') }
    await loadPaymentMethods()
    cancelEditMethod()
    success.value = 'Método actualizado'
  } catch(e){
    methodsError.value = e.message || 'Error al actualizar método'
  } finally {
    methodsLoading.value = false
  }
}
async function deleteMethod(m){
  try{
    methodsLoading.value = true
    const resp = await fetch(`http://localhost:3000/api/payments/methods/${m.idMetodoPagoUsuario}`,{ method:'DELETE' })
    const data = await resp.json()
    if(!resp.ok){ throw new Error(data.error||'Error al eliminar método') }
    await loadPaymentMethods()
    success.value = 'Método eliminado'
  } catch(e){
    methodsError.value = e.message || 'Error al eliminar método'
  } finally {
    methodsLoading.value = false
  }
}

const toggleNewsletter = async () => {
  if (!usuario.value) return

  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const targetState = !newsletterSubscribed.value
    const url = targetState
      ? 'http://localhost:3000/api/newsletter/subscribe'
      : 'http://localhost:3000/api/newsletter/unsubscribe'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: usuario.value.emailUsuario,
        idUsuario: usuario.value.idUsuario
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al actualizar suscripción al newsletter')
    }

    newsletterSubscribed.value = targetState
    // Guardar también en localStorage para mantener consistencia local
    const updatedUser = { ...usuario.value, newsletterSubscribed: targetState }
    usuario.value = updatedUser
    localStorage.setItem('usuario', JSON.stringify(updatedUser))

    success.value = targetState
      ? 'Te has suscrito al newsletter correctamente.'
      : 'Has cancelado la suscripción al newsletter. Ya no recibirás correos.'
  } catch (err) {
    error.value = err.message || 'Error al actualizar suscripción al newsletter'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const userData = localStorage.getItem('usuario')
  if (!userData) {
    router.push('/login')
    return
  }

  try {
    usuario.value = JSON.parse(userData)
    // Cargar datos en el formulario
    form.value = {
      nombreUsuario: usuario.value.nombreUsuario || '',
      apellidoUsuario: usuario.value.apellidoUsuario || '',
      emailUsuario: usuario.value.emailUsuario || '',
      telefonoUsuario: usuario.value.telefonoUsuario || '',
      direccionUsuario: usuario.value.direccionUsuario || ''
    }

    // Estado inicial del newsletter: usar SIEMPRE lo que venga del login/localStorage
    // (puede venir como 0/1, true/false, etc.)
    newsletterSubscribed.value = !!usuario.value.newsletterSubscribed

    // Normalizar también en el objeto guardado
    const updatedUser = { ...usuario.value, newsletterSubscribed: newsletterSubscribed.value }
    usuario.value = updatedUser
    localStorage.setItem('usuario', JSON.stringify(updatedUser))

  } catch (e) {
    console.error('Error al parsear usuario:', e)
    localStorage.removeItem('usuario')
    router.push('/login')
  }
  await loadPaymentMethods()
  await loadCartCount()
})

const toggleEdit = () => {
  isEditing.value = !isEditing.value
  error.value = ''
  success.value = ''
}

const cancelEdit = () => {
  // Restaurar valores originales
  form.value = {
    nombreUsuario: usuario.value.nombreUsuario || '',
    apellidoUsuario: usuario.value.apellidoUsuario || '',
    emailUsuario: usuario.value.emailUsuario || '',
    telefonoUsuario: usuario.value.telefonoUsuario || '',
    direccionUsuario: usuario.value.direccionUsuario || ''
  }
  isEditing.value = false
  error.value = ''
  success.value = ''
}

const saveProfile = async () => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const response = await fetch(`http://localhost:3000/api/auth/update-profile/${usuario.value.idUsuario}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form.value)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al actualizar perfil')
    }

    // Actualizar localStorage con los nuevos datos
    const updatedUser = { ...usuario.value, ...form.value }
    localStorage.setItem('usuario', JSON.stringify(updatedUser))
    usuario.value = updatedUser

    success.value = '¡Perfil actualizado correctamente!'
    isEditing.value = false

    // Recargar la página para actualizar el header
    setTimeout(() => {
      window.location.reload()
    }, 1500)

  } catch (err) {
    error.value = err.message || 'Error al actualizar perfil'
  } finally {
    loading.value = false
  }
}

const changePassword = async () => {
  error.value = ''
  success.value = ''

  // Validaciones
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    error.value = 'Todos los campos de contraseña son requeridos'
    return
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    error.value = 'Las contraseñas nuevas no coinciden'
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    error.value = 'La nueva contraseña debe tener al menos 6 caracteres'
    return
  }

  loading.value = true

  try {
    const response = await fetch(`http://localhost:3000/api/auth/change-password/${usuario.value.idUsuario}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al cambiar contraseña')
    }

    success.value = '¡Contraseña cambiada correctamente!'

    // Limpiar formulario
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    showPasswordForm.value = false

  } catch (err) {
    error.value = err.message || 'Error al cambiar contraseña'
  } finally {
    loading.value = false
  }
}

// Eliminar cuenta
const showDeleteConfirm = ref(false)
const deletePassword = ref('')

const deleteAccount = async () => {
  error.value = ''
  success.value = ''

  if (!deletePassword.value) {
    error.value = 'Debes ingresar tu contraseña para eliminar la cuenta'
    return
  }

  loading.value = true

  try {
    const response = await fetch(`http://localhost:3000/api/auth/delete-account/${usuario.value.idUsuario}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: deletePassword.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al eliminar cuenta')
    }

    success.value = 'Cuenta eliminada correctamente. Redirigiendo...'

    // Limpiar localStorage y redirigir
    localStorage.removeItem('usuario')
    setTimeout(() => {
      router.push('/')
    }, 2000)

  } catch (err) {
    error.value = err.message || 'Error al eliminar cuenta'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header :cart-count="cartCount" />

    <main class="flex-1 py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mx-auto">
        <div class="mb-5 sm:mb-6">
          <h1 class="text-2xl sm:text-3xl font-bold">Mi Perfil</h1>
          <p class="text-xs sm:text-sm text-muted-foreground mt-1">Administra tu información personal</p>
        </div>

        <!-- Mensajes de error y éxito -->
        <div v-if="error" class="mb-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>
        <div v-if="success" class="mb-4 bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-md text-sm">
          {{ success }}
        </div>

        <!-- Card de información del perfil -->
        <div class="bg-card border border-border rounded-xl p-6 mb-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold">Información Personal</h2>
            <button
              v-if="!isEditing"
              @click="toggleEdit"
              class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition text-sm font-medium"
            >
              Editar Perfil
            </button>
          </div>

          <form @submit.prevent="saveProfile" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium">Nombre</label>
                <input
                  v-model="form.nombreUsuario"
                  type="text"
                  required
                  :disabled="!isEditing || loading"
                  :class="[
                    'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                    !isEditing ? 'bg-secondary cursor-not-allowed' : 'bg-background'
                  ]"
                />
              </div>

              <div class="space-y-1">
                <label class="block text-sm font-medium">Apellido</label>
                <input
                  v-model="form.apellidoUsuario"
                  type="text"
                  required
                  :disabled="!isEditing || loading"
                  :class="[
                    'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                    !isEditing ? 'bg-secondary cursor-not-allowed' : 'bg-background'
                  ]"
                />
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium">Correo Electrónico</label>
              <input
                v-model="form.emailUsuario"
                type="email"
                required
                :disabled="!isEditing || loading"
                :class="[
                  'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                  !isEditing ? 'bg-secondary cursor-not-allowed' : 'bg-background'
                ]"
              />
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium">Teléfono</label>
              <input
                v-model="form.telefonoUsuario"
                type="tel"
                :disabled="!isEditing || loading"
                :class="[
                  'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                  !isEditing ? 'bg-secondary cursor-not-allowed' : 'bg-background'
                ]"
              />
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium">Dirección</label>
              <input
                v-model="form.direccionUsuario"
                type="text"
                :disabled="!isEditing || loading"
                :class="[
                  'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                  !isEditing ? 'bg-secondary cursor-not-allowed' : 'bg-background'
                ]"
              />
            </div>

            <!-- Newsletter toggle -->
            <div class="mt-6 pt-4 border-t border-border">
              <div class="flex items-center justify-between gap-4">
                <div class="flex-1">
                  <p class="text-sm font-medium flex items-center gap-2">
                    <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">✉️</span>
                    Notificaciones por correo
                  </p>
                  <p class="text-xs text-muted-foreground mt-1">
                    Recibe novedades, ofertas y actualizaciones en tu bandeja de entrada.
                  </p>
                  <p class="mt-1 text-[11px]" :class="newsletterSubscribed ? 'text-emerald-500' : 'text-muted-foreground'">
                    {{ newsletterSubscribed ? 'Actualmente estás suscrito al newsletter.' : 'No estás suscrito al newsletter.' }}
                  </p>
                </div>

                <!-- Switch visual -->
                <button
                  type="button"
                  @click="toggleNewsletter"
                  :disabled="loading"
                  class="relative inline-flex items-center rounded-full px-1 py-0.5 text-[11px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="newsletterSubscribed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'"
                >
                  <span class="px-2">
                    {{ newsletterSubscribed ? 'Suscrito' : 'No suscrito' }}
                  </span>
                  <span
                    class="ml-1 inline-flex h-5 w-9 items-center rounded-full transition-colors"
                    :class="newsletterSubscribed ? 'bg-emerald-500/90' : 'bg-border'"
                  >
                    <span
                      class="h-4 w-4 rounded-full bg-background shadow-sm transform transition-transform duration-200"
                      :class="newsletterSubscribed ? 'translate-x-4' : 'translate-x-0'"
                    />
                  </span>
                </button>
              </div>
            </div>

            <div v-if="isEditing" class="flex gap-3 pt-4">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition font-medium disabled:opacity-50"
              >
                {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
              <button
                type="button"
                @click="cancelEdit"
                :disabled="loading"
                class="px-4 py-2 border border-border rounded-md hover:bg-secondary transition font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <!-- Card de cambio de contraseña -->
        <div class="bg-card border border-border rounded-xl p-6">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h2 class="text-xl font-semibold">Seguridad</h2>
              <p class="text-sm text-muted-foreground mt-1">Cambia tu contraseña</p>
            </div>
            <button
              v-if="!showPasswordForm"
              @click="showPasswordForm = true"
              class="px-4 py-2 border border-border rounded-md hover:bg-secondary transition text-sm font-medium"
            >
              Cambiar Contraseña
            </button>
          </div>

          <form v-if="showPasswordForm" @submit.prevent="changePassword" class="space-y-4 mt-4">
            <div class="space-y-1">
              <label class="block text-sm font-medium">Contraseña Actual</label>
              <input
                v-model="passwordForm.currentPassword"
                type="password"
                required
                :disabled="loading"
                class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium">Nueva Contraseña</label>
              <input
                v-model="passwordForm.newPassword"
                type="password"
                required
                minlength="6"
                :disabled="loading"
                class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <p class="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium">Confirmar Nueva Contraseña</label>
              <input
                v-model="passwordForm.confirmPassword"
                type="password"
                required
                :disabled="loading"
                class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition font-medium disabled:opacity-50"
              >
                {{ loading ? 'Cambiando...' : 'Cambiar Contraseña' }}
              </button>
              <button
                type="button"
                @click="showPasswordForm = false; passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' }"
                :disabled="loading"
                class="px-4 py-2 border border-border rounded-md hover:bg-secondary transition font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <!-- Métodos de pago -->
        <div class="bg-card border border-border rounded-xl p-6 mt-8">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h2 class="text-xl font-semibold">Métodos de pago</h2>
              <p class="text-sm text-muted-foreground mt-1">Administra tus tarjetas guardadas</p>
            </div>
          </div>
          <div v-if="methodsError" class="mb-3 bg-red-500/10 border border-red-500 text-red-500 px-3 py-2 rounded-md text-sm">{{ methodsError }}</div>
          <div v-if="methodsLoading" class="text-sm text-muted-foreground">Cargando métodos...</div>
          <div v-else>
            <div v-if="!paymentMethods.length" class="text-sm text-muted-foreground">No tienes métodos guardados.</div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-for="m in paymentMethods" :key="m.idMetodoPagoUsuario" class="border border-border rounded-md p-4">
                <div class="flex items-start gap-3">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <div class="font-semibold">{{ m.aliasTarjeta || m.nombreMetodo || 'Tarjeta' }}</div>
                      <span v-if="m.sim" class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">Simulado</span>
                      <span v-else-if="m.esPredeterminado" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">Predeterminado</span>
                    </div>
                    <div class="text-sm text-muted-foreground">**** **** **** {{ m.ultimos4 }}</div>
                    <div class="text-xs text-muted-foreground">Expira: {{ m.mesExpiracion }}/{{ String(m.anioExpiracion).slice(-2) }}</div>
                  </div>
                </div>

                <div v-if="editingMethodId === m.idMetodoPagoUsuario" class="mt-3 space-y-2">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs text-muted-foreground">Alias</label>
                      <input v-model="editMethodForm.aliasTarjeta" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted-foreground">Titular</label>
                      <input v-model="editMethodForm.titularTarjeta" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <label v-if="!m.sim" class="text-xs flex items-center gap-2">
                    <input type="checkbox" v-model="editMethodForm.esPredeterminado" />
                    Establecer como predeterminado
                  </label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div class="sm:col-span-2">
                      <label class="block text-xs text-muted-foreground">Número de tarjeta</label>
                      <input v-model="editMethodForm.cardNumber" placeholder="•••• •••• •••• ••••" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted-foreground">Mes expiración</label>
                      <input v-model="editMethodForm.expMonth" placeholder="MM" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted-foreground">Año expiración</label>
                      <input v-model="editMethodForm.expYear" placeholder="YYYY o YY" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted-foreground">CVV</label>
                      <input v-model="editMethodForm.cvv" placeholder="CVV" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div class="flex gap-2 justify-end">
                    <button class="px-3 py-1.5 border border-border rounded-md text-sm" @click="cancelEditMethod">Cancelar</button>
                    <button class="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm" :disabled="methodsLoading" @click="saveMethodChanges(m)">Guardar</button>
                  </div>
                </div>
                <div v-else class="mt-3 flex gap-2 justify-end">
                  <button class="px-3 py-1.5 border border-border rounded-md text-sm" @click="startEditMethod(m)">Editar</button>
                  <button class="px-3 py-1.5 bg-red-500 text-white rounded-md text-sm" :disabled="methodsLoading" @click="deleteMethod(m)">Eliminar</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card de zona peligrosa -->
        <div class="bg-card border border-red-500/20 rounded-xl p-6 mt-8">
          <div class="mb-4">
            <h2 class="text-xl font-semibold text-red-500">Zona Peligrosa</h2>
            <p class="text-sm text-muted-foreground mt-1">Elimina tu cuenta permanentemente</p>
          </div>

          <div v-if="!showDeleteConfirm" class="space-y-3">
            <p class="text-sm text-muted-foreground">
              Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegúrate de estar seguro.
            </p>
            <button
              @click="showDeleteConfirm = true"
              class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition font-medium"
            >
              Eliminar mi cuenta
            </button>
          </div>

          <div v-else class="space-y-4">
            <div class="bg-red-500/10 border border-red-500/30 rounded-md p-4">
              <div class="flex gap-3">
                <svg class="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <path d="M12 9v4"/>
                  <path d="M12 17h.01"/>
                </svg>
                <div>
                  <h3 class="text-sm font-semibold text-red-500">¡Advertencia!</h3>
                  <p class="text-sm text-muted-foreground mt-1">
                    Esta acción es permanente y no se puede deshacer. Todos tus datos, pedidos e información serán eliminados.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium">Confirma tu contraseña para continuar</label>
              <input
                v-model="deletePassword"
                type="password"
                required
                :disabled="loading"
                placeholder="Ingresa tu contraseña"
                class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              />
            </div>

            <div class="flex gap-3">
              <button
                @click="deleteAccount"
                :disabled="loading"
                class="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition font-medium disabled:opacity-50"
              >
                {{ loading ? 'Eliminando...' : 'Sí, eliminar mi cuenta' }}
              </button>
              <button
                @click="showDeleteConfirm = false; deletePassword = ''"
                :disabled="loading"
                class="px-4 py-2 border border-border rounded-md hover:bg-secondary transition font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>
