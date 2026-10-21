/**
 * indian-finance-formulas
 *
 * The money maths behind https://gainly.in, the free calculators for India: SIP, step-up SIP, goal SIP, lumpsum,
 * FD, RD, PPF, loan EMI, compound interest, inflation, stock average, CAGR and IPO allotment chance.
 * Plain functions, no dependencies, the same results as the calculators on the site (checked by the tests).
 *
 * Rates are yearly, in percent (12 means 12% a year). Amounts are in rupees. Nothing is rounded: format the
 * result yourself. Estimates only, not financial advice.
 *
 * @license MIT
 */

const COMPOUNDING = { yearly: 1, 'half-yearly': 2, quarterly: 4, monthly: 12, daily: 365 };

function periodsPerYear(compounding) {
  const n = COMPOUNDING[compounding];
  if (!n) throw new RangeError(`compounding must be one of: ${Object.keys(COMPOUNDING).join(', ')}`);
  return n;
}

/**
 * Monthly SIP. Each instalment goes in at the start of the month and grows at rate ÷ 12 a month, the way
 * mutual fund SIP calculators in India work. Optional yearly step-up raises the instalment once a year.
 *
 * sip({ monthly: 5000, rate: 12, years: 10 }).value  // ≈ 11,61,695
 *
 * @param {{monthly: number, rate: number, years: number, stepUp?: number}} p
 * @returns {{value: number, invested: number, gains: number, lastInstalment: number, yearly: {year: number, instalment: number, invested: number, value: number}[]}}
 */
export function sip({ monthly, rate, years, stepUp = 0 }) {
  const i = rate / 12 / 100;
  let value = 0;
  let invested = 0;
  let instalment = monthly;
  let lastInstalment = monthly;
  const yearly = [];
  for (let year = 1; year <= years; year++) {
    for (let m = 0; m < 12; m++) {
      value = (value + instalment) * (1 + i);
      invested += instalment;
    }
    yearly.push({ year, instalment, invested, value });
    lastInstalment = instalment;
    instalment *= 1 + stepUp / 100;
  }
  return { value, invested, gains: value - invested, lastInstalment, yearly };
}

/**
 * Monthly SIP needed to reach a goal: the SIP formula in reverse. With inflation, the goal is in today's rupees
 * and is first grown to goal × (1 + inflation)^years.
 *
 * sipForGoal({ goal: 1e7, years: 15, rate: 12 }).monthly  // ≈ 19,819
 *
 * @param {{goal: number, years: number, rate: number, stepUp?: number, inflation?: number}} p
 * @returns {{monthly: number, goalInFutureRupees: number, invested: number, gains: number, lumpsumToday: number}}
 */
export function sipForGoal({ goal, years, rate, stepUp = 0, inflation = 0 }) {
  const target = goal * (1 + inflation / 100) ** years;
  const perRupee = sip({ monthly: 1, rate, years, stepUp }).value;
  const monthly = perRupee > 0 ? target / perRupee : 0;
  const run = sip({ monthly, rate, years, stepUp });
  return {
    monthly,
    goalInFutureRupees: target,
    invested: run.invested,
    gains: run.value - run.invested,
    lumpsumToday: target / (1 + rate / 100) ** years,
  };
}

/**
 * One-time investment growing at a yearly rate.
 *
 * @param {{amount: number, rate: number, years: number}} p
 * @returns {{value: number, gains: number}}
 */
export function lumpsum({ amount, rate, years }) {
  const value = amount * (1 + rate / 100) ** years;
  return { value, gains: value - amount };
}

/**
 * Fixed deposit, compounded the way Indian banks do it (quarterly by default): P × (1 + r/n)^(n × t).
 * Years can be a fraction (1.5 = 18 months).
 *
 * fd({ amount: 100000, rate: 7, years: 5 }).maturity  // ≈ 1,41,478
 *
 * @param {{amount: number, rate: number, years: number, compounding?: 'yearly'|'half-yearly'|'quarterly'|'monthly'}} p
 * @returns {{maturity: number, interest: number, effectiveRate: number}}
 */
export function fd({ amount, rate, years, compounding = 'quarterly' }) {
  const n = periodsPerYear(compounding);
  const maturity = amount * (1 + rate / 100 / n) ** (n * years);
  return { maturity, interest: maturity - amount, effectiveRate: ((1 + rate / 100 / n) ** n - 1) * 100 };
}

/**
 * Recurring deposit with quarterly compounding (India Post and most banks): each instalment k of m earns
 * (1 + r/400)^(k/3).
 *
 * rd({ monthly: 5000, rate: 6.7, months: 60 }).maturity  // ≈ 3,56,829
 *
 * @param {{monthly: number, rate: number, months: number}} p
 * @returns {{maturity: number, deposited: number, interest: number}}
 */
export function rd({ monthly, rate, months }) {
  const q = 1 + rate / 400;
  let maturity = 0;
  for (let k = 1; k <= months; k++) maturity += monthly * q ** (k / 3);
  const deposited = monthly * months;
  return { maturity, deposited, interest: maturity - deposited };
}

/**
 * Public Provident Fund: a yearly deposit made at the start of the year (by 5 April), interest credited once a
 * year. PPF runs 15 years and can then be extended in blocks of 5: other values are rounded to 15, 20, 25 …
 *
 * @param {{yearly: number, rate: number, years?: number}} p
 * @returns {{maturity: number, invested: number, interest: number, years: number}}
 */
export function ppf({ yearly, rate, years = 15 }) {
  const y = 15 + 5 * Math.max(0, Math.round((years - 15) / 5));
  let balance = 0;
  for (let i = 1; i <= y; i++) balance = (balance + yearly) * (1 + rate / 100);
  const invested = yearly * y;
  return { maturity: balance, invested, interest: balance - invested, years: y };
}

/**
 * Loan EMI on a reducing balance: P × r × (1 + r)^n ÷ ((1 + r)^n − 1), with r = rate ÷ 12 ÷ 100 and n in months.
 *
 * emi({ amount: 500000, rate: 10, months: 24 })  // ≈ 23,072.46
 *
 * @param {{amount: number, rate: number, months: number}} p
 * @returns {number}
 */
export function emi({ amount, rate, months }) {
  if (months <= 0) return 0;
  const r = rate / 12 / 100;
  if (r === 0) return amount / months;
  const f = (1 + r) ** months;
  return (amount * r * f) / (f - 1);
}

/**
 * The full loan: EMI, total interest and a year-by-year schedule.
 *
 * @param {{amount: number, rate: number, months: number}} p
 * @returns {{emi: number, totalInterest: number, totalPaid: number, yearly: {year: number, principal: number, interest: number, balance: number}[]}}
 */
export function loanSchedule({ amount, rate, months }) {
  const e = emi({ amount, rate, months });
  const r = rate / 12 / 100;
  let balance = amount;
  let totalInterest = 0;
  let yp = 0;
  let yi = 0;
  const yearly = [];
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const principal = Math.min(e - interest, balance);
    balance -= principal;
    yp += principal;
    yi += interest;
    totalInterest += interest;
    if (m % 12 === 0 || m === months) {
      yearly.push({ year: Math.ceil(m / 12), principal: yp, interest: yi, balance: Math.max(0, balance) });
      yp = 0;
      yi = 0;
    }
  }
  return { emi: e, totalInterest, totalPaid: amount + totalInterest, yearly };
}

/**
 * The loan amount a given EMI can repay (the EMI formula in reverse).
 *
 * @param {{emi: number, rate: number, months: number}} p
 * @returns {number}
 */
export function loanForEmi({ emi: e, rate, months }) {
  if (months <= 0 || e <= 0) return 0;
  const r = rate / 12 / 100;
  if (r === 0) return e * months;
  const f = (1 + r) ** months;
  return (e * (f - 1)) / (r * f);
}

/**
 * Compound interest A = P(1 + r/n)^(nt), with optional monthly additions (added at month end).
 *
 * @param {{principal: number, rate: number, years: number, compounding?: 'yearly'|'half-yearly'|'quarterly'|'monthly'|'daily', monthly?: number}} p
 * @returns {{value: number, invested: number, interest: number, effectiveRate: number}}
 */
export function compoundInterest({ principal, rate, years, compounding = 'yearly', monthly = 0 }) {
  const n = periodsPerYear(compounding);
  const perPeriod = rate / 100 / n;
  const monthFactor = (1 + perPeriod) ** (n / 12);
  let fromAdditions = 0;
  for (let m = 0; m < years * 12; m++) fromAdditions = fromAdditions * monthFactor + monthly;
  const value = principal * (1 + perPeriod) ** (n * years) + fromAdditions;
  const invested = principal + monthly * 12 * years;
  return { value, invested, interest: value - invested, effectiveRate: ((1 + perPeriod) ** n - 1) * 100 };
}

/**
 * What today's expense will cost after some years of inflation.
 *
 * futureCost({ amount: 100000, inflation: 6, years: 10 })  // ≈ 1,79,085
 *
 * @param {{amount: number, inflation: number, years: number}} p
 * @returns {number}
 */
export function futureCost({ amount, inflation, years }) {
  return amount * (1 + inflation / 100) ** years;
}

/**
 * What an amount received in future is worth in today's rupees.
 *
 * presentValue({ amount: 100000, inflation: 6, years: 10 })  // ≈ 55,839
 *
 * @param {{amount: number, inflation: number, years: number}} p
 * @returns {number}
 */
export function presentValue({ amount, inflation, years }) {
  return amount / (1 + inflation / 100) ** years;
}

/**
 * Months for money to double at a yearly compounded rate: 12 × ln 2 ÷ ln(1 + rate ÷ 100).
 * Kisan Vikas Patra at 7.5% gives 115 (rounded).
 *
 * @param {number} rate
 * @returns {number}
 */
export function monthsToDouble(rate) {
  return rate > 0 ? (12 * Math.log(2)) / Math.log(1 + rate / 100) : Infinity;
}

/**
 * Yearly growth rate between two values (CAGR), in percent.
 *
 * @param {{start: number, end: number, years: number}} p
 * @returns {number}
 */
export function cagr({ start, end, years }) {
  if (start <= 0 || years <= 0) return NaN;
  return ((end / start) ** (1 / years) - 1) * 100;
}

/**
 * Average buy price of shares bought in several goes. Bonus shares are a buy at price 0.
 *
 * stockAverage([{ shares: 100, price: 500 }, { shares: 50, price: 400 }]).average  // 466.67 (≈)
 *
 * @param {{shares: number, price: number}[]} buys
 * @returns {{average: number, shares: number, cost: number}}
 */
export function stockAverage(buys) {
  let shares = 0;
  let cost = 0;
  for (const b of buys) {
    if (b.shares > 0) {
      shares += b.shares;
      cost += b.shares * b.price;
    }
  }
  return { average: shares > 0 ? cost / shares : 0, shares, cost };
}

/**
 * Chance of getting at least one lot in the retail portion of a mainboard IPO. When it is oversubscribed, lots
 * go one per application by lottery, so one application's chance is about (lots per application ÷ times
 * subscribed). With several PANs in a family: 1 − (1 − p)^n. An estimate: the registrar's lottery decides.
 *
 * ipoAllotmentChance({ timesSubscribed: 20 })  // 0.05
 *
 * @param {{timesSubscribed: number, applications?: number, lotsPerApplication?: number}} p
 * @returns {number} between 0 and 1
 */
export function ipoAllotmentChance({ timesSubscribed, applications = 1, lotsPerApplication = 1 }) {
  const p = timesSubscribed <= 1 ? 1 : Math.min(1, lotsPerApplication / timesSubscribed);
  return 1 - (1 - p) ** Math.max(1, Math.floor(applications));
}
