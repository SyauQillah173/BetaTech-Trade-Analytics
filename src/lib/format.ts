/**
 * Single source of truth for rendering a quote.
 * Forex rates are dimensionless ratios, so they carry no currency symbol;
 * crypto and commodities are quoted in USD.
 * ponytail: extend the symbol map here if more asset classes are added.
 */
export function formatQuote(value: number, decimals: number, type?: string): string {
  const body =
    decimals > 2
      ? value.toFixed(decimals)
      : value.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  return type === 'forex' ? body : `$${body}`;
}
