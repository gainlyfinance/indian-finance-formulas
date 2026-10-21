// Results are checked against test/vectors.json, which comes from the calculators running on gainly.in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as f from './index.js';

const v = JSON.parse(readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'));
const close = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 1e-6 * Math.max(1, Math.abs(expected)), `${msg}: ${actual} vs ${expected}`);

test('SIP, with and without step-up', () => {
  for (const { in: i, value, invested } of v.sip) {
    const r = f.sip({ monthly: i.m, rate: i.r, years: i.y, stepUp: i.s });
    close(r.value, value, 'value');
    close(r.invested, invested, 'invested');
  }
});

test('SIP for a goal is the SIP in reverse, with inflation', () => {
  for (const { in: i, monthly } of v.sipForGoal) {
    close(f.sipForGoal({ goal: i.g, years: i.y, rate: i.r, stepUp: i.s, inflation: i.inf }).monthly, monthly, 'monthly');
  }
  const g = f.sipForGoal({ goal: 2500000, years: 15, rate: 12, inflation: 8 });
  close(f.sip({ monthly: g.monthly, rate: 12, years: 15 }).value, g.goalInFutureRupees, 'round trip');
});

test('Lumpsum, FD, RD and PPF', () => {
  for (const { in: i, value } of v.lumpsum) close(f.lumpsum({ amount: i.a, rate: i.r, years: i.y }).value, value, 'lumpsum');
  for (const { in: i, maturity } of v.fd) close(f.fd({ amount: i.a, rate: i.r, years: i.y, compounding: i.c }).maturity, maturity, 'fd');
  for (const { in: i, maturity } of v.rd) close(f.rd({ monthly: i.m, rate: i.r, months: i.n }).maturity, maturity, 'rd');
  for (const { in: i, maturity } of v.ppf) close(f.ppf({ yearly: i.d, rate: i.r, years: i.y }).maturity, maturity, 'ppf');
  assert.equal(f.ppf({ yearly: 1, rate: 7, years: 17 }).years, 15);
  assert.equal(f.ppf({ yearly: 1, rate: 7, years: 18 }).years, 20);
  assert.throws(() => f.fd({ amount: 1, rate: 7, years: 1, compounding: 'weekly' }), RangeError);
});

test('Loan EMI, schedule and the reverse', () => {
  for (const { in: i, emi, totalInterest } of v.emi) {
    const months = i.y * 12;
    close(f.emi({ amount: i.a, rate: i.r, months }), emi, 'emi');
    const s = f.loanSchedule({ amount: i.a, rate: i.r, months });
    close(s.totalInterest, totalInterest, 'total interest');
    assert.equal(s.yearly.length, i.y);
    close(s.yearly.at(-1).balance, 0, 'paid off');
    close(f.loanForEmi({ emi, rate: i.r, months }), i.a, 'loan for emi');
  }
  assert.equal(f.emi({ amount: 120000, rate: 0, months: 12 }), 10000);
});

test('Compound interest', () => {
  for (const { in: i, value } of v.compoundInterest) {
    close(f.compoundInterest({ principal: i.p, rate: i.r, years: i.y, compounding: i.c, monthly: i.m }).value, value, 'value');
  }
});

test('Inflation, doubling, CAGR, stock average, IPO allotment', () => {
  close(f.futureCost({ amount: 100000, inflation: 6, years: 10 }), v.futureCost, 'future cost');
  close(f.presentValue({ amount: 100000, inflation: 6, years: 10 }), v.presentValue, 'present value');
  assert.equal(Math.round(f.monthsToDouble(7.5)), v.kvpMonths);
  close(f.cagr({ start: 100000, end: 200000, years: 6 }), (2 ** (1 / 6) - 1) * 100, 'cagr');
  assert.equal(Math.round(f.stockAverage([{ shares: 100, price: 500 }, { shares: 50, price: 400 }]).average * 100) / 100, v.stockAverage);
  close(f.ipoAllotmentChance({ timesSubscribed: 20, applications: 3 }) * 100, v.ipo, 'ipo');
  assert.equal(f.ipoAllotmentChance({ timesSubscribed: 0.8 }), 1);
});
