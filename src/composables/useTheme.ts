import { ref, watch } from 'vue'

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
      // auto: remove attribute and let media query handle it
      root.removeAttribute('data-theme')
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

  // Initialize
  updateTheme()
  checkDarkMode()

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
