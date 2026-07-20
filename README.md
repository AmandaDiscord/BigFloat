# BigFloat

Arbitrary precision floating point arithmetic for JavaScript/TypeScript.
`BigInt` gives you unlimited size integers, but no mantissa for floating point and doesn't allow the number primitive to interact with it even if it could and round back to an int.

## This lib is not currently on NPM - just a PoC

```ts
import { BigFloat } from "@amanda/big-float";

new BigFloat("0.1").add("0.2").toString(); // "0.3"
new BigFloat(2).pow(-2).toString();        // "0.25"
new BigFloat(1).div(3).toString();         // "0.33333333333333333333"
```

All arithmetic methods return a new `BigFloat`; the instance you call them on is never mutated.
You cannot use the standard arithmetic operators as JS only allows you at most to pick which primitive to coerce to and no control over how it operates.

| Method                           | Description                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `.add(x)`                        | Addition.                                                                                 |
| `.sub(x)`                        | Subtraction.                                                                              |
| `.mul(x)`                        | Multiplication.                                                                           |
| `.div(x)`                        | Division, rounded to 20 decimal places. Throws on division by zero.                       |
| `.mod(x)`                        | Modulo. Sign follows the dividend, same as JS's `%`. Throws on modulo by zero.            |
| `.pow(x)`                        | Exponentiation. `x` must be an integer. negative exponents are supported.                 |
| `.equals(x)`                     | Numeric equality (`1.50` equals `1.5`).                                                   |
| `.greater(x)` / `.less(x)`       | Strict numeric comparison.                                                                |
| `.greatOrEq(x)` / `.lessOrEq(x)` | Non strict numeric comparison.                                                            |
| `.toString()`                    | Canonical decimal string, always with at least one fractional digit (`"3.0"`, not `"3"`). |
| `.toFixed(precision)`            | Like Number.toFixed(precision). Throws on a negative/non integer `precision`.             |

## Precision

Division can't always terminate repeating numbers like the result of 1 / 3, so results are rounded to **20 decimal digits**. Addition, subtraction, multiplication, and modulo never round. they're exact for however many digits you put in, however large.
