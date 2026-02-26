import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from './useTelegram'

/**
 * Show Telegram back button.
 * @param enabledOrCallback — `true` to enable with default navigate(-1),
 *   a function for custom handler, or `false`/`undefined` to skip.
 */
export function useBackButton(enabledOrCallback?: boolean | (() => void)) {
  const { tg } = useTelegram()
  const navigate = useNavigate()
  const btn = tg.BackButton

  // enabled unless explicitly `false`
  const enabled = enabledOrCallback !== false

  useEffect(() => {
    if (!enabled) return

    const handler = () => {
      if (typeof enabledOrCallback === 'function') {
        enabledOrCallback()
      } else {
        navigate(-1)
      }
    }

    btn.show()
    btn.onClick(handler)

    return () => {
      btn.offClick(handler)
      btn.hide()
    }
  }, [btn, navigate, enabled, enabledOrCallback])
}
