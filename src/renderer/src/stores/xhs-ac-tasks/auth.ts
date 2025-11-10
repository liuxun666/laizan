import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('xhs-auth', () => {
  const hasAuth = ref<boolean | null>(null)

  const login = async (): Promise<void> => {
    await window.api.loginXHS()
    hasAuth.value = await window.api.hasXHSAuth()
  }

  const logout = async (): Promise<void> => {
    window.api.logoutXHS()
    hasAuth.value = await window.api.hasXHSAuth()
  }

  const checkAuth = async (): Promise<void> => {
    hasAuth.value = await window.api.hasXHSAuth()
  }

  return {
    hasAuth,
    login,
    logout,
    checkAuth
  }
})
