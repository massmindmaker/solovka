import { useEffect, useState } from 'react'

// Безопасный враппер вокруг Telegram WebApp
// В браузере без Telegram — возвращает заглушки для dev

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
  }
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
      is_premium?: boolean
    }
    start_param?: string
  }
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    isProgressVisible: boolean
    setText: (text: string) => void
    onClick: (fn: () => void) => void
    offClick: (fn: () => void) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
  }
  BackButton: {
    isVisible: boolean
    onClick: (fn: () => void) => void
    offClick: (fn: () => void) => void
    show: () => void
    hide: () => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  showPopup: (params: {
    title?: string
    message: string
    buttons?: Array<{ id?: string; type?: string; text?: string }>
  }, callback?: (id: string) => void) => void
  platform: string
  version: string
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

// Мок для разработки в браузере
const MOCK_WEBAPP: TelegramWebApp = {
  ready: () => console.log('[TMA Mock] ready()'),
  expand: () => console.log('[TMA Mock] expand()'),
  close: () => console.log('[TMA Mock] close()'),
  colorScheme: 'light',
  themeParams: {
    bg_color: '#ffffff',
    text_color: '#000000',
    hint_color: '#999999',
    button_color: '#2481cc',
    button_text_color: '#ffffff',
    secondary_bg_color: '#f1f1f1',
  },
  initData: '',
  initDataUnsafe: {
    user: {
      id: 123456789,
      first_name: 'Иван',
      last_name: 'Петров',
      username: 'ivanpetrov',
      language_code: 'ru',
    },
  },
  MainButton: {
    text: '',
    color: '#2481cc',
    textColor: '#ffffff',
    isVisible: false,
    isActive: true,
    isProgressVisible: false,
    setText: (t) => console.log('[TMA Mock] MainButton.setText:', t),
    onClick: (fn) => { window._tmaMainButtonHandler = fn },
    offClick: () => { delete window._tmaMainButtonHandler },
    show: () => console.log('[TMA Mock] MainButton.show()'),
    hide: () => console.log('[TMA Mock] MainButton.hide()'),
    enable: () => console.log('[TMA Mock] MainButton.enable()'),
    disable: () => console.log('[TMA Mock] MainButton.disable()'),
    showProgress: () => console.log('[TMA Mock] MainButton.showProgress()'),
    hideProgress: () => console.log('[TMA Mock] MainButton.hideProgress()'),
  },
  BackButton: {
    isVisible: false,
    onClick: (fn) => { window._tmaBackButtonHandler = fn },
    offClick: () => { delete window._tmaBackButtonHandler },
    show: () => console.log('[TMA Mock] BackButton.show()'),
    hide: () => console.log('[TMA Mock] BackButton.hide()'),
  },
  HapticFeedback: {
    impactOccurred: (s) => console.log('[TMA Mock] haptic impact:', s),
    notificationOccurred: (t) => console.log('[TMA Mock] haptic notification:', t),
    selectionChanged: () => console.log('[TMA Mock] haptic selection'),
  },
  showPopup: (params, cb) => {
    const result = window.confirm(`${params.title ? params.title + '\n' : ''}${params.message}`)
    cb?.(result ? (params.buttons?.[0]?.id ?? 'ok') : 'cancel')
  },
  platform: 'browser',
  version: '6.0',
}

declare global {
  interface Window {
    _tmaMainButtonHandler?: () => void
    _tmaBackButtonHandler?: () => void
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp ?? MOCK_WEBAPP
  const isDev = !window.Telegram?.WebApp
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(tg.colorScheme)

  useEffect(() => {
    tg.ready()
    tg.expand()

    const handler = () => setColorScheme(tg.colorScheme)
    // В реальном Telegram это событие приходит через postMessage
    window.addEventListener('themeChanged', handler)
    return () => window.removeEventListener('themeChanged', handler)
  }, [tg])

  return {
    tg,
    isDev,
    colorScheme,
    user: tg.initDataUnsafe.user,
    initData: tg.initData,
    haptic: tg.HapticFeedback,
  }
}
