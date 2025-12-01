export function tokenToHex(token: string) {
  switch (token) {
    case 'gold':
      return '#f59e0b'
    case 'silver':
      return '#9ca3af'
    case 'bronze':
      return '#b45309'
    case 'onyx':
      return '#111827'
    case 'emerald':
      return '#10b981'
    case 'sapphire':
      return '#2563eb'
    case 'ruby':
      return '#dc2626'
    default:
      return '#94a3b8'
  }
}
