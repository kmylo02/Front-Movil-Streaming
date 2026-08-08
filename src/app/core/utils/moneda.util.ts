export function parsePesos(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  const soloDigitos = String(valor).replace(/[^\d]/g, '');
  return soloDigitos ? parseInt(soloDigitos, 10) : 0;
}

export function formatoPesos(valor: string | number | null | undefined): string {
  const num = typeof valor === 'string' ? parsePesos(valor) : valor;
  if (!num) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num);
}
