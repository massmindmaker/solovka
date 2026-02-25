import { useEffect, useRef } from 'react'
import { useTelegram } from './useTelegram'

interface MainButtonOptions {
  text: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  visible?: boolean
}

export function useMainButton(options: MainButtonOptions) {
  const { tg } = useTelegram()
  const btn = tg.MainButton
  const cbRef = useRef(options.onClick)
  cbRef.current = options.onClick

  useEffect(() => {
    const handler = () => cbRef.current()
    btn.onClick(handler)

    return () => {
      btn.offClick(handler)
      btn.hide()
    }
  }, [btn])

  useEffect(() => {
    const visible = options.visible ?? true
    if (!visible) {
      btn.hide()
      return
    }

    btn.setText(options.text)

    if (options.loading) {
      btn.showProgress(false)
      btn.disable()
    } else {
      btn.hideProgress()
      if (options.disabled) {
        btn.disable()
      } else {
        btn.enable()
      }
    }

    btn.show()
  }, [btn, options.text, options.disabled, options.loading, options.visible])
}
