import type { SVGProps } from 'react'

const paths = {
  'arrow-ne': 'M7 17 L17 7 M9 7 H17 V15',
  check: 'M5 12.5 L9.5 17 L19 7',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M6.34 17.66l-1.41 1.41 M19.07 4.93l-1.41 1.41',
} as const

export type IconName = keyof typeof paths

type IconProps = {
  name: IconName
} & Omit<SVGProps<SVGSVGElement>, 'name'>

export function Icon({ name, className = '', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
