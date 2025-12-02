<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const forgotOpen = ref(false)
const fpEmail = ref('')
const fpCode = ref('')
const fpNewPass = ref('')
const fpLoading = ref(false)
const fpError = ref('')
const fpSuccess = ref('')
const fpStep = ref(1)

const handleSubmit = async () => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailUsuario: email.value,
        passwordHash: password.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión')
    }

    // Guardar información del usuario en localStorage
    localStorage.setItem('usuario', JSON.stringify(data.usuario))

    success.value = '¡Inicio de sesión exitoso!'

    // Redirigir según el rol del usuario
    setTimeout(() => {
      const rolesAdmin = ['EMPLEADO', 'ADMIN', 'Empleado', 'Administrador', 'Admin']
      if (rolesAdmin.includes(data.usuario.nombreRol)) {
        router.push('/dashboard')
      } else {
        router.push('/')
      }
    }, 1000)

  } catch (err) {
    error.value = err.message || 'Error al iniciar sesión. Por favor, intenta de nuevo.'
  } finally {
    loading.value = false
  }
}

const abrirForgot = () => {
  fpEmail.value = email.value || ''
  fpCode.value = ''
  fpNewPass.value = ''
  fpError.value = ''
  fpSuccess.value = ''
  fpStep.value = 1
  forgotOpen.value = true
}

const enviarCodigo = async () => {
  fpError.value = ''
  fpSuccess.value = ''
  if (!fpEmail.value) { fpError.value = 'Ingresa tu correo'; return }
  fpLoading.value = true
  try {
    const resp = await fetch('http://localhost:3000/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailUsuario: fpEmail.value })
    })
    const data = await resp.json().catch(()=> ({}))
    if (!resp.ok) throw new Error(data.error || 'No se pudo enviar el código')
    fpSuccess.value = data.message || 'Código enviado'
    fpStep.value = 2
  } catch (e) {
    fpError.value = e.message || 'Error enviando código'
  } finally {
    fpLoading.value = false
  }
}

const restablecerContrasena = async () => {
  fpError.value = ''
  fpSuccess.value = ''
  if (!fpEmail.value || !fpCode.value || !fpNewPass.value) { fpError.value = 'Completa todos los campos'; return }
  fpLoading.value = true
  try {
    const resp = await fetch('http://localhost:3000/api/auth/forgot/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailUsuario: fpEmail.value, codigo: fpCode.value, nuevaContrasena: fpNewPass.value })
    })
    const data = await resp.json().catch(()=> ({}))
    if (!resp.ok) throw new Error(data.error || 'No se pudo restablecer la contraseña')
    fpSuccess.value = data.message || 'Contraseña restablecida'
    setTimeout(() => { forgotOpen.value = false }, 1000)
  } catch (e) {
    fpError.value = e.message || 'Error al restablecer la contraseña'
  } finally {
    fpLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background text-foreground px-4 sm:px-6">
    <div class="w-full max-w-sm sm:max-w-md bg-card border border-border rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
      <h1 class="text-xl sm:text-2xl font-bold text-center">Iniciar sesión</h1>
      <p class="text-xs sm:text-sm text-muted-foreground text-center">Accede a tu cuenta para continuar</p>

      <!-- Mensajes de error y éxito -->
      <div v-if="error" class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-md text-sm">
        {{ error }}
      </div>
      <div v-if="success" class="bg-green-500/10 border border-green-500 text-green-500 px-4 py-2 rounded-md text-sm">
        {{ success }}
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <label class="block text-sm font-medium">Correo electrónico</label>
          <input
            v-model="email"
            type="email"
            required
            :disabled="loading"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium">Contraseña</label>
          <input
            v-model="password"
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
          {{ loading ? 'Iniciando sesión...' : 'Entrar' }}
        </button>
        <div class="text-center">
          <button type="button" @click="abrirForgot" class="mt-2 text-xs sm:text-sm text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </form>

      <p class="text-xs sm:text-sm text-center text-muted-foreground">
        ¿No tienes cuenta?
        <RouterLink to="/register" class="text-primary hover:underline">Regístrate</RouterLink>
      </p>
    </div>
    <!-- Forgot Password Modal -->
    <div v-if="forgotOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" @click.self="forgotOpen = false">
      <div class="w-full max-w-md bg-card text-foreground rounded-xl shadow-xl border border-border p-6">
        <h2 class="text-lg sm:text-xl font-bold mb-2">Recuperar contraseña</h2>
        <p class="text-xs sm:text-sm text-muted-foreground mb-4">Te enviaremos un código de 4 dígitos a tu correo.</p>

        <div v-if="fpError" class="mb-3 bg-red-500/10 border border-red-500 text-red-500 px-3 py-2 rounded text-sm">{{ fpError }}</div>
        <div v-if="fpSuccess" class="mb-3 bg-green-500/10 border border-green-500 text-green-600 px-3 py-2 rounded text-sm">{{ fpSuccess }}</div>

        <div v-if="fpStep === 1" class="space-y-3">
          <label class="block text-sm font-medium">Correo</label>
          <input v-model="fpEmail" type="email" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="tu@correo.com" />
          <button @click="enviarCodigo" :disabled="fpLoading" class="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 transition disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700">{{ fpLoading ? 'Enviando...' : 'Enviar código' }}</button>
        </div>

        <div v-else class="space-y-3">
          <label class="block text-sm font-medium">Correo</label>
          <input v-model="fpEmail" type="email" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <label class="block text-sm font-medium">Código de 4 dígitos</label>
          <input v-model="fpCode" maxlength="4" inputmode="numeric" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <label class="block text-sm font-medium">Nueva contraseña</label>
          <input v-model="fpNewPass" type="password" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Mínimo 6 caracteres" />
          <button @click="restablecerContrasena" :disabled="fpLoading" class="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 transition disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700">{{ fpLoading ? 'Guardando...' : 'Restablecer' }}</button>
        </div>

        <div class="mt-4 text-center">
          <button type="button" @click="forgotOpen = false" class="text-xs sm:text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>
