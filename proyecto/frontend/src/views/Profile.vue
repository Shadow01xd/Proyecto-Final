<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const router = useRouter()

const usuario = ref(null)
const isEditing = ref(false)

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

onMounted(() => {
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
  } catch (e) {
    console.error('Error al parsear usuario:', e)
    localStorage.removeItem('usuario')
    router.push('/login')
  }
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
    <Header />

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
