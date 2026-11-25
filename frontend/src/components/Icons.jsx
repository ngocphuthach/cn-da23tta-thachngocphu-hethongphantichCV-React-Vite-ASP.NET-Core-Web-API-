function Icon({ name, size = 20, className = '', children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`cc-icon cc-icon-${name}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </svg>
  )
}

export function SparklesIcon(props) {
  return <Icon name="sparkles" {...props}><path className="cc-icon-accent" d="m12 2.8 2.35 6.1 6.25 2.4-6.25 2.25L12 20l-2.35-6.45L3.4 11.3l6.25-2.4L12 2.8Z" /><path className="cc-icon-secondary" d="m19.1 16.2.8 2.05 2.1.8-2.1.75-.8 2.1-.8-2.1-2.1-.75 2.1-.8.8-2.05Z" /></Icon>
}

export function UploadCloudIcon(props) {
  return <Icon name="upload" {...props}><path className="cc-icon-soft-fill" d="M18.6 18.7H7.2a4.8 4.8 0 1 1 .4-9.6 7 7 0 0 1 13.3 2.6 3.6 3.6 0 0 1-2.3 7Z" /><path d="M12 19V9.5m0 0-3.5 3.3M12 9.5l3.5 3.3" /></Icon>
}

export function FileTextIcon(props) {
  return <Icon name="document" {...props}><path className="cc-icon-soft-fill" d="M6.3 2.7h7.1l5.2 5.2v12.3a1.7 1.7 0 0 1-1.7 1.7H6.3a1.7 1.7 0 0 1-1.7-1.7V4.4a1.7 1.7 0 0 1 1.7-1.7Z" /><path d="M13.2 2.9v5.4h5.3M8.3 12h7.4M8.3 15.5h7.4M8.3 18.8h4.8" /></Icon>
}

export function CheckCircleIcon(props) {
  return <Icon name="check" {...props}><circle className="cc-icon-success-fill" cx="12" cy="12" r="9.3" /><path className="cc-icon-white-line" d="m7.5 12.1 3 3.1 6-6.2" /></Icon>
}

export function AlertCircleIcon(props) {
  return <Icon name="alert" {...props}><circle className="cc-icon-danger-fill" cx="12" cy="12" r="9.2" /><path className="cc-icon-white-line" d="M12 7.3v5.3m0 3.8h.01" /></Icon>
}

export function AlertTriangleIcon(props) {
  return <Icon name="warning" {...props}><path className="cc-icon-warning-fill" d="M10.1 3.9a2.2 2.2 0 0 1 3.8 0l8 14a2.2 2.2 0 0 1-1.9 3.3H4a2.2 2.2 0 0 1-1.9-3.3l8-14Z" /><path className="cc-icon-dark-line" d="M12 9v4.2m0 3.3h.01" /></Icon>
}

export function TrendingUpIcon(props) {
  return <Icon name="trend-up" {...props}><path className="cc-icon-soft-fill" d="M3.4 17.8 9.1 12l3.8 3.8L21 7.5v5h-2.1V11l-6 6-3.8-3.8-4.2 4.3h-1.5Z" /><path d="m3.5 18 5.6-5.8 3.8 3.8 8-8.5M15.8 7.5H21v5.2" /></Icon>
}

export function TrendingDownIcon(props) {
  return <Icon name="trend-down" {...props}><path className="cc-icon-soft-fill" d="m3.4 6.2 5.7 5.8 3.8-3.8L21 16.5v-5h-2.1V13l-6-6-3.8 3.8-4.2-4.3H3.4Z" /><path d="m3.5 6 5.6 5.8 3.8-3.8 8 8.5m-5.1 0H21v-5.2" /></Icon>
}

export function ArrowRightIcon(props) {
  return <Icon name="arrow-right" {...props}><path className="cc-icon-soft-fill" d="M3 10h13.4L12 5.6 14.3 3l7.5 8-7.5 8-2.3-2.6 4.4-4.4H3z" /><path d="M3.8 12h15m-5.2-5.2 5.2 5.2-5.2 5.2" /></Icon>
}

export function Trash2Icon(props) {
  return <Icon name="trash" {...props}><path className="cc-icon-danger-fill" d="M5.5 7.2h13l-1 13.1H6.5l-1-13.1Zm3-3.1h7l1.1 2.4H7.4l1.1-2.4Z" /><path d="M3.5 6.5h17m-8.5 4v6.4m-3-6.4v6.4m6-6.4v6.4" /></Icon>
}

export function RefreshCwIcon(props) {
  return <Icon name="refresh" {...props}><path className="cc-icon-soft-fill" d="M20 7.2V3.5l-2.2 2.2A8.3 8.3 0 0 0 4.5 9l2.1.7a6.1 6.1 0 0 1 9.6-2.4H12v2.1h8V7.2Zm-16 9.6v3.7l2.2-2.2A8.3 8.3 0 0 0 19.5 15l-2.1-.7a6.1 6.1 0 0 1-9.6 2.4H12v-2.1H4Z" /><path d="M20 7.5v-4l-2.2 2.2A8 8 0 0 0 4.6 10M4 16.5v4l2.2-2.2A8 8 0 0 0 19.4 14" /></Icon>
}

export function CompassIcon(props) {
  return <Icon name="compass" {...props}><circle className="cc-icon-soft-fill" cx="12" cy="12" r="9.2" /><path className="cc-icon-accent" d="m16.9 7.1-2.7 7.1-7.1 2.7 2.7-7.1 7.1-2.7Z" /><path d="m16.9 7.1-2.7 7.1-7.1 2.7 2.7-7.1 7.1-2.7Z" /></Icon>
}

export function BriefcaseIcon(props) {
  return <Icon name="briefcase" {...props}><rect className="cc-icon-soft-fill" x="3" y="7.5" width="18" height="13" rx="2.5" /><path d="M8.2 7.3V5.5a2 2 0 0 1 2-2h3.6a2 2 0 0 1 2 2v1.8M3.3 12h17.4M10 12v2.3h4V12" /></Icon>
}

export function ShieldCheckIcon(props) {
  return <Icon name="shield" {...props}><path className="cc-icon-soft-fill" d="M12 2.5c2.2 1.7 5.1 2.5 8 2.7v7.2c0 4.2-2.7 7.4-8 9.1-5.3-1.7-8-4.9-8-9.1V5.2c2.9-.2 5.8-1 8-2.7Z" /><path d="M12 3.5c2.3 1.5 4.8 2.2 7 2.4v6.5c0 3.5-2.3 6.3-7 8-4.7-1.7-7-4.5-7-8V5.9c2.2-.2 4.7-.9 7-2.4Z" /><path className="cc-icon-accent-line" d="m8.5 12.2 2.3 2.3 4.8-4.9" /></Icon>
}

export function ZapIcon(props) {
  return <Icon name="zap" {...props}><path className="cc-icon-accent" d="m13.6 2.2-9.1 11h6.2l-.4 8.6 9.2-11h-6.3l.4-8.6Z" /><path d="m13.6 2.2-9.1 11h6.2l-.4 8.6 9.2-11h-6.3l.4-8.6Z" /></Icon>
}

export function AwardIcon(props) {
  return <Icon name="award" {...props}><circle className="cc-icon-accent" cx="12" cy="8.5" r="5.7" /><path d="M8.3 13.1 7 21l5-2.6 5 2.6-1.3-7.9" /><path className="cc-icon-white-line" d="m9.5 8.6 1.7 1.7 3.4-3.5" /></Icon>
}

export function ChevronRightIcon(props) {
  return <Icon name="chevron-right" {...props}><path className="cc-icon-accent-line" d="m8.5 4.8 7 7.2-7 7.2" /><path d="m7.3 4.8 7 7.2-7 7.2" /></Icon>
}

export function ChevronDownIcon(props) {
  return <Icon name="chevron-down" {...props}><path className="cc-icon-accent-line" d="m4.8 8.5 7.2 7 7.2-7" /><path d="m4.8 7.3 7.2 7 7.2-7" /></Icon>
}

export function XIcon(props) {
  return <Icon name="close" {...props}><circle className="cc-icon-soft-fill" cx="12" cy="12" r="9" /><path d="m8.5 8.5 7 7m0-7-7 7" /></Icon>
}

export function ClockIcon(props) {
  return <Icon name="clock" {...props}><circle className="cc-icon-soft-fill" cx="12" cy="12" r="9.2" /><path d="M12 6.7v5.8l4 2.2" /></Icon>
}

export function TargetIcon(props) {
  return <Icon name="target" {...props}><circle className="cc-icon-soft-fill" cx="12" cy="12" r="9.2" /><circle cx="12" cy="12" r="5.4" /><circle className="cc-icon-accent" cx="12" cy="12" r="2" /></Icon>
}

export function UserIcon(props) {
  return <Icon name="user" {...props}><circle className="cc-icon-soft-fill" cx="12" cy="8" r="4.1" /><path className="cc-icon-soft-fill" d="M4.2 21v-1.6a7.8 7.8 0 0 1 15.6 0V21H4.2Z" /><circle cx="12" cy="8" r="3.2" /><path d="M5 20.5v-1.2a7 7 0 0 1 14 0v1.2" /></Icon>
}
