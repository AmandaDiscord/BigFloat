import assert from "node:assert/strict";
import { BigFloat } from "./src/index.ts";

const eq = (actual: { toString(): string }, expected: string, label: string) =>
	assert.equal(actual.toString(), expected, label);

// division (was completely broken: stale remainder, unaligned decimals, zero-base short-circuit)
eq(new BigFloat(10).div(5), "2.0", "exact division");
eq(new BigFloat("1.5").div("0.25"), "6.0", "different mantissa lengths");
eq(new BigFloat("0.5").div(2), "0.25", "dividend < 1");
eq(new BigFloat(1).div(3), "0.33333333333333333333", "repeating decimal capped at 20 digits");
eq(new BigFloat(2).div(3), "0.66666666666666666667", "last digit rounds, not truncates");
eq(new BigFloat(-10).div(4), "-2.5", "negative dividend");
assert.throws(() => new BigFloat(1).div("0.0"), /Division by zero/);

// mod (was: returned divisor on even division, zero for dividends < 1, O(quotient) loop)
eq(new BigFloat(10).mod(5), "0.0", "even mod");
eq(new BigFloat("0.5").mod(2), "0.5", "dividend < divisor");
eq(new BigFloat(-7).mod(3), "-1.0", "sign follows dividend like JS %");
eq(new BigFloat("10.5").mod("0.25"), "0.0", "fractional divisor");
eq(new BigFloat("1000000000000000000000").mod(7), "6.0", "large dividend terminates");
assert.throws(() => new BigFloat(1).mod(0n), /Modulo by zero/);

// mixed-sign add (was: double-padded comparison fed subtraction backwards)
eq(new BigFloat("1.5").add("-14.25"), "-12.75", "mixed sign, different mantissa lengths");
eq(new BigFloat("-1.5").add("14.25"), "12.75", "mirrored");
eq(new BigFloat(5).sub(5), "0.0", "sub to zero, no negative zero");
eq(new BigFloat("0.1").add("0.2"), "0.3", "decimal add is exact");

// pow (was: sign of exponent silently dropped)
eq(new BigFloat(2).pow(-2), "0.25", "negative exponent");
eq(new BigFloat("1.5").pow(3), "3.375", "fractional base");
eq(new BigFloat(0).pow(0), "1.0", "0^0 = 1 like Math.pow");
assert.throws(() => new BigFloat(2).pow("0.5"), /Non-integer/);

// construction (was: NaN/Infinity/scientific notation produced corrupt state)
eq(new BigFloat(1e21), "1000000000000000000000.0", "large number in e-notation");
eq(new BigFloat(1e-7), "0.0000001", "small number in e-notation");
eq(new BigFloat("2.5e3"), "2500.0", "e-notation string");
eq(new BigFloat(123n), "123.0", "bigint");
eq(new BigFloat("123n"), "123.0", "inspect-style n suffix");
eq(new BigFloat(new BigFloat("-1.5")), "-1.5", "copy constructor");
eq(new BigFloat("-0.0"), "0.0", "negative zero normalizes");
eq(new BigFloat("007.500"), "7.5", "leading/trailing zeros normalize");
assert.throws(() => new BigFloat(Number.NaN), TypeError);
assert.throws(() => new BigFloat(Number.POSITIVE_INFINITY), TypeError);
assert.throws(() => new BigFloat("1.2.3"), TypeError);

// precision is no longer silently truncated on construction; only div rounds
eq(new BigFloat("0.100000000000000000001"), "0.100000000000000000001", "input precision preserved");

// comparisons route through numeric value, not string equality
assert.equal(new BigFloat("1.50").equals("1.5"), true, "equal across representations");
assert.equal(new BigFloat("1.05").greater("2.5"), false, "mantissa alignment");
assert.equal(new BigFloat(-2).less(-1), true, "negative ordering");
assert.equal(new BigFloat("2.5").greatOrEq("2.5"), true);
assert.equal(new BigFloat("2.5").lessOrEq(2), false);

// toFixed (was: toFixed(0) -> "5.", always truncated)
assert.equal(new BigFloat("5.5").toFixed(0), "6", "toFixed(0) rounds like Number#toFixed");
assert.equal(new BigFloat("-1.25").toFixed(1), "-1.3", "rounds away from zero");
assert.equal(new BigFloat("1.5").toFixed(3), "1.500", "pads");
assert.throws(() => new BigFloat(1).toFixed(-1), RangeError);

// non-mutation: operations return new instances
const original = new BigFloat("1.5");
original.add(1);
original.div(2);
eq(original, "1.5", "operands are immutable");

console.log("all tests passed");
