import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from './useTelegram'

export function useBackButton(onBack?: () => void) {
  const { tg } = useTelegram()
  const navigate = useNavigate()
  const btn = tg.BackButton

  useEffect(() => {
    const handler = () => {
      if (onBack) {
        onBack()
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
  }, [btn, navigate, onBack])
}
