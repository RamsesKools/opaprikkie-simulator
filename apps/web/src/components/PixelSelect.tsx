import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

type Props<T extends string> = {
  label: string
  value: T
  options: Record<T, string>
  onChange: (value: T) => void
  disabled?: boolean
}

// Select-only combobox: native <select> popups can't be styled, so the menu is drawn here.
export function PixelSelect<T extends string>({ label, value, options, onChange, disabled }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  const keys = Object.keys(options) as T[]

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function show() {
    setFocused(keys.indexOf(value))
    setOpen(true)
  }

  function pick(key: T) {
    onChange(key)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent) {
    const nav: Record<string, () => void> = open
      ? {
          ArrowDown: () => setFocused((i) => Math.min(i + 1, keys.length - 1)),
          ArrowUp: () => setFocused((i) => Math.max(i - 1, 0)),
          Home: () => setFocused(0),
          End: () => setFocused(keys.length - 1),
          Enter: () => pick(keys[focused]),
          ' ': () => pick(keys[focused]),
          Escape: () => setOpen(false),
        }
      : { ArrowDown: show, ArrowUp: show, Enter: show, ' ': show }
    if (e.key === 'Tab') setOpen(false)
    if (!nav[e.key]) return
    e.preventDefault()
    nav[e.key]()
  }

  return (
    <div className="px-field">
      <span id={`${id}-label`}>{label}</span>
      <div className="px-select" ref={root}>
        <button
          type="button"
          role="combobox"
          className="px-input px-select-button"
          aria-labelledby={`${id}-label`}
          aria-controls={`${id}-list`}
          aria-expanded={open}
          aria-activedescendant={open ? `${id}-${focused}` : undefined}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onKeyDown}
        >
          {options[value]}
        </button>
        {open && (
          <ul className="px-select-list" id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`}>
            {keys.map((key, i) => (
              <li
                key={key}
                id={`${id}-${i}`}
                role="option"
                aria-selected={key === value}
                className={i === focused ? 'focused' : undefined}
                onMouseEnter={() => setFocused(i)}
                onClick={() => pick(key)}
              >
                {options[key]}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
