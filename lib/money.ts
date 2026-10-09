export const TOKEN_DECIMALS = 7;

/** Convierte "20.5" -> 205000000n (7 decimales). Rechaza más decimales de los soportados. */
export function parseUnits(input: string, decimals = TOKEN_DECIMALS): bigint {
  const value = input.trim().replace(/,/g, ".");
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`Monto inválido: "${input}"`);
  }
  const [whole, frac = ""] = value.split(".");
  if (frac.length > decimals) {
    throw new Error(`Máximo ${decimals} decimales`);
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
}

/** Convierte 205000000n -> "20.5". */
export function formatUnits(amount: bigint, decimals = TOKEN_DECIMALS): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = groupThousands((abs / base).toString());
  const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? `,${frac}` : ""}`;
}

export function formatToken(amount: bigint, symbol: string, decimals = TOKEN_DECIMALS): string {
  return `${formatUnits(amount, decimals)} ${symbol}`;
}

export function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error(`Entero fuera de rango seguro: ${value}`);
    return BigInt(value);
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  throw new Error(`No es un entero válido: ${String(value)}`);
}

export function sumBigInt(values: bigint[]): bigint {
  return values.reduce((acc, v) => acc + v, 0n);
}

/** Separador de miles "." consistente (es-ES no agrupa números de 4 cifras). */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatViews(views: number): string {
  return groupThousands(String(views));
}
