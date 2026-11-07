// Historical daily BTC/USD reference quotes for the 55-day story: 2025-05-19 to 2025-07-12.
// Source: CoinMarketCap's historical BTC-USD close series (2025-05-24 checked
// against the CoinMarketCap 24 May 2025 historical snapshot: 107,791.16 USD).
// Secondary source mirror for the complete daily dataset:
// https://huggingface.co/datasets/Projet4AIABoursiere/stock-market-data/blob/main/BTC-USD.csv
// Single offline table; this is a day-level reference, NOT an intraday live quote.
export const HISTORICAL_BTC_USD_SOURCE='CoinMarketCap / BTC-USD daily close, 2025';
export const HISTORICAL_BTC_USD_SOURCE_URL='https://coinmarketcap.com/historical/20250524/';
export const BTC_USD_DAILY_2025=Object.freeze([
  105606.18,106791.09,109678.08,111673.28,107287.80,107791.16,
  109035.39,109440.37,108994.64,107802.33,105641.76,103998.57,
  104638.09,105652.10,105881.53,105432.47,104731.98,101575.95,
  104390.34,105615.63,105793.65,110294.10,110257.23,108686.63,
  105929.05,106090.97,105472.41,105552.02,106796.76,104601.12,
  104883.33,104684.29,103309.60,102257.41,100987.14,105577.77,
  106045.63,107361.26,106960.00,107088.43,107327.70,108385.57,
  107135.34,105698.28,108859.32,109647.98,108034.34,108231.18,
  109232.07,108299.85,108950.27,111326.55,115987.20,117516.99,
  117435.23
]);
export function historicalBtcUsd(day){
  if(!Number.isInteger(day)||day<1||day>BTC_USD_DAILY_2025.length)throw Error('没有对应日期的历史 BTC/USD 报价');
  return BTC_USD_DAILY_2025[day-1];
}
// The official May 2025 monthly AVERAGE, not an intraday spot quote.
// AMCM via Macao DSEC: MOP 803.84 per 100 USD.
export const MAY_2025_MOP_PER_USD_AVERAGE=8.0384;
