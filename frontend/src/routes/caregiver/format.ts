export function titleCase(text: string | null | undefined) {
  return text ? text.toLowerCase().split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ') : 'Not provided'
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }).format(new Date(value + 'T00:00:00+08:00'))
}
export function visitTime(value: string) {
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Singapore' }).format(new Date(value + (/Z$|[+-]\d\d:\d\d$/.test(value) ? '' : '+08:00')))
}
export function todayInSingapore() {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Singapore' }).formatToParts(new Date())
  const part = (name: string) => parts.find(p => p.type === name)?.value
  return part('year') + '-' + part('month') + '-' + part('day')
}
export function addDays(day: string, offset: number) {
  const date = new Date(day + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
