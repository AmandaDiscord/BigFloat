# BigFloat

Arbitrary-precision decimal arithmetic for JavaScript/TypeScript. `BigInt` gives you unlimited-size integers but no fractional part; `BigFloat` adds the decimal point back without falling into `number`'s floating-point rounding errors.

```ts
import { BigFloat } from "@amanda/big-float";

new BigFloat("0.1").add("0.2").toString(); // "0.3" — not 0.30000000000000004
new BigFloat(2).pow(-2).toString();        // "0.25"
new BigFloat(1).div(3).toString();         // "0.33333333333333333333"
```

## How it works

A `BigFloat` is a `bigint` plus a count of how many of its rightmost digits sit after the decimal point — `5.25` is stored as `525n` with `2` decimal places, not as text. Arithmetic lines the decimal places up (or adds them, for multiplication) and lets native `bigint` math do the rest, so results are exact for `+`, `-`, `*`, and `%`. Only `div` produces a repeating/irrational result, which is why it's rounded to a fixed precision (see below).

Accepts a `bigint`, `number`, `string`, or another `BigFloat`. Strings/numbers may use scientific notation (`"1e-7"`, `1e21`) and an optional trailing `n` (so `util.inspect`'s BigInt output round-trips). Anything that isn't a finite decimal number — `NaN`, `Infinity`, malformed strings — throws a `TypeError`

## API

All arithmetic methods return a new `BigFloat`; the instance you call them on is never mutated.

| Method                           | Description                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `.add(x)`                        | Addition. Exact.                                                                          |
| `.sub(x)`                        | Subtraction. Exact.                                                                       |
| `.mult(x)`                       | Multiplication. Exact.                                                                    |
| `.div(x)`                        | Division, rounded to 20 decimal places (half away from zero). Throws on division by zero. |
| `.mod(x)`                        | Modulo. Sign follows the dividend, same as JS's `%`. Throws on modulo by zero.            |
| `.pow(x)`                        | Exponentiation. `x` must be an integer. negative exponents are supported.                 |
| `.equals(x)`                     | Numeric equality (`1.50` equals `1.5`).                                                   |
| `.greater(x)` / `.less(x)`       | Strict numeric comparison.                                                                |
| `.greatOrEq(x)` / `.lessOrEq(x)` | Non-strict numeric comparison.                                                            |
| `.toString()`                    | Canonical decimal string, always with at least one fractional digit (`"3.0"`, not `"3"`). |
| `.toFixed(precision)`            | Like Number.toFixed(precision). Throws on a negative/non-integer `precision`.             |

Every method that takes an argument accepts the same types as the constructor (`bigint | number | string | BigFloat`) — no need to wrap it in `new BigFloat(...)` first.

## Why no `+`, `-`, `*`, `/`?

JavaScript has no operator overloading. `Symbol.toPrimitive`/`valueOf` let an object choose which *primitive* it collapses into before an operator runs, but the operator then executes on that primitive — there's no hook that lets `a + b` construct and return a new `BigFloat`. Any hook that returns a `number` would silently reintroduce the float rounding error this library exists to avoid; one that returns a `bigint` would truncate the fractional part.

`BigFloat` doesn't define either hook, so this is already live today and worth knowing about even though it isn't going to change: every operator falls back to `toString()`, so two `BigFloat`s combined with a native operator do something silently wrong rather than erroring:

```ts
new BigFloat(9) < new BigFloat(10);   // false  — "9.0" vs "10.0" compared as strings, not numbers
new BigFloat(1) + new BigFloat(2);    // "1.02.0" — string concatenation
new BigFloat(5) - new BigFloat(2);    // 3 — silently demoted to a plain, lossy number
```

Use the methods in the table above instead — they're the only supported way to do arithmetic or comparisons.

## Precision

Division can't always terminate (`1 / 3`), so results are rounded to **20 decimal digits**. Addition, subtraction, multiplication, and modulo never round — they're exact for however many digits you put in, however large.
