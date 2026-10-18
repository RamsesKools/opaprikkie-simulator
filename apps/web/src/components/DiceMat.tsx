import type { CSSProperties, ReactNode } from 'react'
import { label } from '../lib/format'

export type Die = {
  face: number
  left: number
  top: number
  rot: number
  fx: number
  fy: number
  spin: number
  td: number
}

type Props = {
  dice: Die[]
  throwId: number
  switchTo: number | null
  switchId: number
  children: ReactNode
}

function dieStyle(d: Die): CSSProperties {
  return {
    left: d.left,
    top: d.top,
    '--face': d.face,
    '--rot': `${d.rot}deg`,
    '--fx': `${d.fx}px`,
    '--fy': `${d.fy}px`,
    '--spin': `${d.spin}deg`,
    '--td': `${d.td}s`,
  } as CSSProperties
}

export function DiceMat({ dice, throwId, switchTo, switchId, children }: Props) {
  return (
    <section className="mat-box wood-frame" aria-label="dice mat">
      <div className="mat">
        {dice.map((d, i) => (
          <div
            key={`${throwId}-${i}`}
            className="die throw"
            role="img"
            aria-label={`die showing ${d.face + 1}`}
            style={dieStyle(d)}
          />
        ))}
        {switchTo !== null && (
          <div key={switchId} className={`switch p${switchTo + 1}`}>
            {label(switchTo)}
          </div>
        )}
      </div>
      {children}
    </section>
  )
}
