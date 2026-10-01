import type { SVGProps } from 'react'

const paths = {
  'arrow-ne': 'M7 17 L17 7 M9 7 H17 V15',
  check: 'M5 12.5 L9.5 17 L19 7',
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
