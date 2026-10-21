# indian-finance-formulas

The money maths behind [Gainly](https://gainly.in), free finance calculators for India in English, Gujarati and
Hindi. SIP, step-up SIP, goal SIP, lumpsum, FD, RD, PPF, loan EMI, compound interest, inflation, stock average,
CAGR and IPO allotment chance, as plain JavaScript functions.

- **Same answers as the calculators on gainly.in.** The tests check every function against numbers taken from the
  live calculators.
- **Indian conventions:** SIP instalments at the start of the month, FD compounded quarterly, RD compounded every
  quarter (India Post style), PPF in blocks of 15 + 5 years, EMI on a reducing balance.
- **No dependencies,** works in Node 18+ and in the browser (ES modules).

## Install

```bash
npm install github:gainlyfinance/indian-finance-formulas
```

Or copy `src/index.js` into your project. It is one file.

## Use

```js
import { sip, sipForGoal, fd, emi, loanSchedule, futureCost } from 'indian-finance-formulas';

sip({ monthly: 5000, rate: 12, years: 10 }).value;                 // 1161695.38  → ₹11,61,695
sip({ monthly: 10000, rate: 11, years: 15, stepUp: 10 }).value;    // with a 10% step-up every year
sipForGoal({ goal: 1e7, years: 15, rate: 12 }).monthly;            // 19818.62    → ₹19,819 a month for ₹1 crore
sipForGoal({ goal: 2500000, years: 15, rate: 12, inflation: 8 });  // goal in today's rupees
fd({ amount: 100000, rate: 7, years: 5 }).maturity;                // 141477.82   → ₹1,41,478 (quarterly)
emi({ amount: 500000, rate: 10, months: 24 });                     // 23072.46
loanSchedule({ amount: 3000000, rate: 8.5, months: 240 }).totalInterest;
futureCost({ amount: 100000, inflation: 6, years: 10 });           // 179084.77
```

Rates are yearly, in percent (`12` means 12% a year). Results are not rounded, so format them the way you want,
for example with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })`.

## Functions

| Function | What it returns |
|---|---|
| `sip({ monthly, rate, years, stepUp? })` | `value`, `invested`, `gains`, `lastInstalment`, `yearly[]` |
| `sipForGoal({ goal, years, rate, stepUp?, inflation? })` | `monthly`, `goalInFutureRupees`, `invested`, `gains`, `lumpsumToday` |
| `lumpsum({ amount, rate, years })` | `value`, `gains` |
| `fd({ amount, rate, years, compounding? })` | `maturity`, `interest`, `effectiveRate` |
| `rd({ monthly, rate, months })` | `maturity`, `deposited`, `interest` |
| `ppf({ yearly, rate, years? })` | `maturity`, `invested`, `interest`, `years` |
| `emi({ amount, rate, months })` | the monthly EMI |
| `loanSchedule({ amount, rate, months })` | `emi`, `totalInterest`, `totalPaid`, `yearly[]` |
| `loanForEmi({ emi, rate, months })` | the loan an EMI can repay |
| `compoundInterest({ principal, rate, years, compounding?, monthly? })` | `value`, `invested`, `interest`, `effectiveRate` |
| `futureCost({ amount, inflation, years })` / `presentValue(…)` | today's cost in future rupees, and the reverse |
| `monthsToDouble(rate)` | months for money to double (KVP: 115 at 7.5%) |
| `cagr({ start, end, years })` | yearly growth rate in % |
| `stockAverage([{ shares, price }, …])` | `average`, `shares`, `cost` |
| `ipoAllotmentChance({ timesSubscribed, applications?, lotsPerApplication? })` | chance of at least one lot, 0 to 1 |

Each function has a short note in `src/index.js` on the method it uses.

## Try them without code

Every formula here has a calculator with charts, a year-by-year table and explanations on
[gainly.in](https://gainly.in): [SIP](https://gainly.in/sip-calculator) ·
[EMI](https://gainly.in/emi-calculator) · [FD](https://gainly.in/fd-calculator) ·
[RD](https://gainly.in/rd-calculator) · [PPF](https://gainly.in/ppf-calculator) ·
[Inflation](https://gainly.in/inflation-calculator) · [Stock average](https://gainly.in/stock-average-calculator).
Want a calculator on your own website instead? [Embed one for free](https://gainly.in/embed).

## Tests

```bash
npm test
```

## Note

These are estimates for planning, not financial, tax or investment advice. Market returns are not guaranteed, and
banks may round or compound slightly differently.

## License

MIT © [Gainly](https://gainly.in)
