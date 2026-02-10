export function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'B';
  return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'Mn';
}

export function formatNumberWithTooltip(num: number): { formatted: string; full: string } {
  return {
    formatted: formatNumber(num),
    full: num.toLocaleString('tr-TR')
  };
}
