export type CastableToBigFloat = bigint | number | string | BigFloat;

const DIV_PRECISION = 20;

// Accepts "123", "-1.5", "1e-7", "2.5e+3"; optional trailing "n" to support the util.inspect form of BigInts
const numberRegex = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?n?$/;

// Value = digits / 10^scale. Scale is kept minimal (>= 0) so equal values have identical parts.
function parse(input: string): [bigint, number] {
	const match = numberRegex.exec(input);
	if (!match) throw new TypeError(`Cannot parse "${input}" as a BigFloat. Input must match ${numberRegex}`);
	const [, sign, whole, fraction = "", exponent = "0"] = match;
	let digits = BigInt(whole + fraction);
	let scale = fraction.length - Number(exponent);
	if (scale < 0) {
		digits *= 10n ** BigInt(-scale);
		scale = 0;
	}
	return normalize(sign ? -digits : digits, scale);
}

function normalize(digits: bigint, scale: number): [bigint, number] {
	while (scale > 0 && digits % 10n === 0n) {
		digits /= 10n;
		scale--;
	}
	return [digits, scale];
}

// Integer division, rounding half away from zero
function roundDiv(numerator: bigint, denominator: bigint): bigint {
	const negative = (numerator < 0n) !== (denominator < 0n);
	const n = numerator < 0n ? -numerator : numerator;
	const d = denominator < 0n ? -denominator : denominator;
	const rounded = (2n * n + d) / (2n * d);
	return negative ? -rounded : rounded;
}

function format(digits: bigint, scale: number): string {
	const negative = digits < 0n;
	const abs = (negative ? -digits : digits).toString().padStart(scale + 1, "0");
	const mantissa = scale === 0 ? "" : `.${abs.slice(-scale)}`;
	return `${negative ? "-" : ""}${scale === 0 ? abs : abs.slice(0, -scale)}${mantissa}`;
}

export class BigFloat {
	#digits = 0n;
	#scale = 0;

	public constructor(backing?: CastableToBigFloat) {
		if (backing === undefined) return;
		if (backing instanceof BigFloat) {
			this.#digits = backing.#digits;
			this.#scale = backing.#scale;
		} else if (typeof backing === "bigint") {
			this.#digits = backing;
		} else {
			[this.#digits, this.#scale] = parse(String(backing));
		}
	}

	public [Symbol.for("nodejs.util.inspect.custom")](): string {
		return `${this.toString()}n`;
	}

	static #make(digits: bigint, scale: number): BigFloat {
		const result = new BigFloat();
		[result.#digits, result.#scale] = normalize(digits, scale);
		return result;
	}

	// Both operands scaled to a common power of ten, so they compare/add/mod as plain bigints
	#aligned(other: BigFloat): [bigint, bigint, number] {
		const scale = Math.max(this.#scale, other.#scale);
		return [
			this.#digits * 10n ** BigInt(scale - this.#scale),
			other.#digits * 10n ** BigInt(scale - other.#scale),
			scale
		];
	}

	#cmp(other: BigFloat): bigint {
		const [left, right] = this.#aligned(other);
		return left - right;
	}

	public greater(rightHand: CastableToBigFloat): boolean {
		return this.#cmp(new BigFloat(rightHand)) > 0n;
	}

	public less(rightHand: CastableToBigFloat): boolean {
		return this.#cmp(new BigFloat(rightHand)) < 0n;
	}

	public equals(rightHand: CastableToBigFloat): boolean {
		return this.#cmp(new BigFloat(rightHand)) === 0n;
	}

	public greatOrEq(rightHand: CastableToBigFloat): boolean {
		return this.#cmp(new BigFloat(rightHand)) >= 0n;
	}

	public lessOrEq(rightHand: CastableToBigFloat): boolean {
		return this.#cmp(new BigFloat(rightHand)) <= 0n;
	}

	public add(rightHand: CastableToBigFloat): BigFloat {
		const [left, right, scale] = this.#aligned(new BigFloat(rightHand));
		return BigFloat.#make(left + right, scale);
	}

	public sub(rightHand: CastableToBigFloat): BigFloat {
		const right = new BigFloat(rightHand);
		return this.add(BigFloat.#make(-right.#digits, right.#scale));
	}

	public mul(rightHand: CastableToBigFloat): BigFloat {
		const right = new BigFloat(rightHand);
		return BigFloat.#make(this.#digits * right.#digits, this.#scale + right.#scale);
	}

	public div(rightHand: CastableToBigFloat): BigFloat {
		const right = new BigFloat(rightHand);
		if (right.#digits === 0n) throw new Error("Division by zero");
		// this/right = (d1/10^s1) / (d2/10^s2) = d1 * 10^s2 / (d2 * 10^s1), scaled up for DIV_PRECISION decimals
		const numerator = this.#digits * 10n ** BigInt(right.#scale + DIV_PRECISION);
		const denominator = right.#digits * 10n ** BigInt(this.#scale);
		return BigFloat.#make(roundDiv(numerator, denominator), DIV_PRECISION);
	}

	public pow(rightHand: CastableToBigFloat): BigFloat {
		const right = new BigFloat(rightHand);
		if (right.#scale !== 0) throw new Error("Non-integer exponents not supported");
		if (right.#digits < 0n) return new BigFloat(1n).div(this.pow(-right.#digits));
		return BigFloat.#make(this.#digits ** right.#digits, this.#scale * Number(right.#digits));
	}

	public mod(rightHand: CastableToBigFloat): BigFloat {
		const right = new BigFloat(rightHand);
		if (right.#digits === 0n) throw new Error("Modulo by zero");
		const [left, rightAligned, scale] = this.#aligned(right);
		// bigint % truncates toward zero with the dividend's sign, same as JS number %
		return BigFloat.#make(left % rightAligned, scale);
	}

	public toString(): string {
		return this.#scale === 0 ? `${format(this.#digits, 0)}.0` : format(this.#digits, this.#scale);
	}

	public toFixed(precision: number): string {
		if (!Number.isInteger(precision) || precision < 0) throw new RangeError("precision must be a non-negative integer");
		const drop = this.#scale - precision;
		const digits = drop > 0
			? roundDiv(this.#digits, 10n ** BigInt(drop))
			: this.#digits * 10n ** BigInt(-drop);
		return format(digits, precision);
	}
}
