import { ref, watch, onMounted } from 'vue'

export function useTheme() {
  const theme = ref<'light' | 'dark' | 'auto'>(
    (localStorage.getItem('theme') as 'light' | 'dark' | 'auto') || 'auto',
  )

  const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    updateTheme()
  }

  const updateTheme = () => {
    const root = document.documentElement

    if (theme.value === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else if (theme.value === 'light') {
      root.removeAttribute('data-theme')
    } else {
      // auto: apply system preference immediately
      root.removeAttribute('data-theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.setAttribute('data-theme', 'dark')
      }
    }
  }

  const isDark = ref(false)

  const checkDarkMode = () => {
    if (theme.value === 'dark') {
      isDark.value = true
    } else if (theme.value === 'light') {
      isDark.value = false
    } else {
      // auto: check system preference
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  }

  // Watch theme changes
  watch(theme, () => {
    updateTheme()
    checkDarkMode()
  })

  // Listen to system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', checkDarkMode)

  // Initialize properly - ensure DOM is ready before checking
  onMounted(() => {
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
      updateTheme()
      checkDarkMode()
    }, 0)
  })

  const toggleTheme = () => {
    if (theme.value === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    updateTheme,
    checkDarkMode,
  }
}
