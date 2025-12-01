<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const nombres = ref('')
const apellidos = ref('')
const email = ref('')
const telefono = ref('')
const direccion = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleSubmit = async () => {
  error.value = ''
  success.value = ''

  // Validar contraseñas
  if (password.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  if (password.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }

  loading.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombreUsuario: nombres.value,
        apellidoUsuario: apellidos.value,
        emailUsuario: email.value,
        passwordHash: password.value,
        telefonoUsuario: telefono.value || null,
        direccionUsuario: direccion.value || null
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al registrar usuario')
    }

    success.value = '¡Registro exitoso! Redirigiendo al inicio de sesión...'

    // Redirigir al login después de 2 segundos
    setTimeout(() => {
      router.push('/login')
    }, 2000)

  } catch (err) {
    error.value = err.message || 'Error al registrar. Por favor, intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background text-foreground px-4 sm:px-6">
    <div class="w-full max-w-sm sm:max-w-md bg-card border border-border rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
      <h1 class="text-xl sm:text-2xl font-bold text-center">Crear cuenta</h1>
      <p class="text-xs sm:text-sm text-muted-foreground text-center">Regístrate para empezar a comprar</p>

      <!-- Mensajes de error y éxito -->
      <div v-if="error" class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-md text-sm">
        {{ error }}
      </div>
      <div v-if="success" class="bg-green-500/10 border border-green-500 text-green-500 px-4 py-2 rounded-md text-sm">
        {{ success }}
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="block text-sm font-medium">Nombres *</label>
            <input
              v-model="nombres"
              type="text"
              required
              :disabled="loading"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div class="space-y-1">
            <label class="block text-sm font-medium">Apellidos *</label>
            <input
              v-model="apellidos"
              type="text"
              required
              :disabled="loading"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium">Correo electrónico *</label>
          <input
            v-model="email"
            type="email"
            required
            :disabled="loading"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium">Teléfono</label>
          <input
            v-model="telefono"
            type="tel"
            :disabled="loading"
            placeholder="Ej: 7777-0000"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium">Dirección</label>
          <input
            v-model="direccion"
            type="text"
            :disabled="loading"
            placeholder="Ej: San Miguel, Col. Centro"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium">Contraseña *</label>
          <input
            v-model="password"
            type="password"
            required
            :disabled="loading"
            minlength="6"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <p class="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium">Confirmar contraseña *</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            :disabled="loading"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-md bg-primary text-primary-foreground font-semibold py-2 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Registrando...' : 'Registrarme' }}
        </button>
      </form>

      <p class="text-xs sm:text-sm text-center text-muted-foreground">
        ¿Ya tienes cuenta?
        <RouterLink to="/login" class="text-primary hover:underline">Inicia sesión</RouterLink>
      </p>
    </div>
  </div>
</template>
