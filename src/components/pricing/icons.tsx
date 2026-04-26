/**
 * Inline SVG icons for the pricing page.
 * Stroke colour is JD green (#367c2b) by default but inheritable via currentColor.
 */

import type { SVGProps } from 'react'

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle cx="8" cy="8" r="6" stroke="#367c2b" strokeWidth="1.5" />
      <path
        d="M8 4v4l2.5 2.5"
        stroke="#367c2b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="2"
        y="2"
        width="12"
        height="12"
        rx="1"
        stroke="#367c2b"
        strokeWidth="1.5"
      />
      <path
        d="M2 6h12M2 10h12M6 2v12M10 2v12"
        stroke="#367c2b"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle cx="8" cy="8" r="3" stroke="#367c2b" strokeWidth="1.5" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"
        stroke="#367c2b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function StackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M3 8l4-4 4 4M7 4v9"
        stroke="#367c2b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 14h10"
        stroke="#367c2b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M10 2C6.5 2 4 4.5 4 8c0 4.5 6 10 6 10s6-5.5 6-10c0-3.5-2.5-6-6-6z"
        stroke="#2a5e22"
        strokeWidth="1.4"
      />
      <circle cx="10" cy="8" r="2" stroke="#2a5e22" strokeWidth="1.4" />
    </svg>
  )
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M9 1.5L11 6L15.5 6.5L12 9.5L13 14L9 11.5L5 14L6 9.5L2.5 6.5L7 6L9 1.5Z"
        stroke="#367c2b"
        strokeWidth="1.2"
      />
    </svg>
  )
}

const iconMap = {
  hourly: ClockIcon,
  perAcre: GridIcon,
  dayRate: SunIcon,
  programme: StackIcon,
} as const

export type ModelIconKey = keyof typeof iconMap

/**
 * Best-effort match between a pricing model title and an icon.
 * Falls back to ClockIcon if no match.
 */
export function pickModelIcon(title: string): ModelIconKey {
  const t = title.toLowerCase()
  if (t.includes('hour')) return 'hourly'
  if (t.includes('acre')) return 'perAcre'
  if (t.includes('day')) return 'dayRate'
  if (t.includes('programme') || t.includes('program')) return 'programme'
  return 'hourly'
}

export const ModelIcon = ({ which }: { which: ModelIconKey }) => {
  const Component = iconMap[which]
  return <Component />
}
