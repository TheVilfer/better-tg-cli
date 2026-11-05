var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// src/paths.ts
function profile() {
  let p = process.env.TG_PROFILE;
  if (isMock() && !p?.startsWith("mock"))
    p = "mock";
  if (!p)
    return;
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(p)) {
    throw new Error(`Invalid TG_PROFILE "${p}": use lowercase letters, digits and dashes`);
  }
  return p;
}
function isMock() {
  return !!process.env.TG_MOCK;
}
function configDir(env = process.env, os = import_node_os.platform()) {
  if (os === "win32" && env.APPDATA)
    return import_node_path2.join(env.APPDATA, `tg${suffix()}`);
  return import_node_path2.join(import_node_os.homedir(), ".config", `tg${suffix()}`);
}
function configFile(name) {
  return import_node_path2.join(configDir(), name);
}
function secretPrefix() {
  return `tg-cli${suffix()}`;
}
var import_node_os, import_node_path2, suffix = () => profile() ? `-${profile()}` : "";
var init_paths = __esm(() => {
  import_node_os = require("node:os");
  import_node_path2 = require("node:path");
});

// node_modules/big-integer/BigInteger.js
var require_BigInteger = __commonJS((exports2, module2) => {
  var bigInt = function(undefined2) {
    var BASE = 1e7, LOG_BASE = 7, MAX_INT = 9007199254740992, MAX_INT_ARR = smallToArray(MAX_INT), DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
    var supportsNativeBigInt = typeof BigInt === "function";
    function Integer(v, radix, alphabet, caseSensitive) {
      if (typeof v === "undefined")
        return Integer[0];
      if (typeof radix !== "undefined")
        return +radix === 10 && !alphabet ? parseValue(v) : parseBase(v, radix, alphabet, caseSensitive);
      return parseValue(v);
    }
    function BigInteger(value, sign) {
      this.value = value;
      this.sign = sign;
      this.isSmall = false;
    }
    BigInteger.prototype = Object.create(Integer.prototype);
    function SmallInteger(value) {
      this.value = value;
      this.sign = value < 0;
      this.isSmall = true;
    }
    SmallInteger.prototype = Object.create(Integer.prototype);
    function NativeBigInt(value) {
      this.value = value;
    }
    NativeBigInt.prototype = Object.create(Integer.prototype);
    function isPrecise(n) {
      return -MAX_INT < n && n < MAX_INT;
    }
    function smallToArray(n) {
      if (n < 1e7)
        return [n];
      if (n < 100000000000000)
        return [n % 1e7, Math.floor(n / 1e7)];
      return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 100000000000000)];
    }
    function arrayToSmall(arr) {
      trim(arr);
      var length = arr.length;
      if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
        switch (length) {
          case 0:
            return 0;
          case 1:
            return arr[0];
          case 2:
            return arr[0] + arr[1] * BASE;
          default:
            return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
        }
      }
      return arr;
    }
    function trim(v) {
      var i2 = v.length;
      while (v[--i2] === 0)
        ;
      v.length = i2 + 1;
    }
    function createArray(length) {
      var x = new Array(length);
      var i2 = -1;
      while (++i2 < length) {
        x[i2] = 0;
      }
      return x;
    }
    function truncate(n) {
      if (n > 0)
        return Math.floor(n);
      return Math.ceil(n);
    }
    function add(a, b) {
      var l_a = a.length, l_b = b.length, r = new Array(l_a), carry = 0, base = BASE, sum, i2;
      for (i2 = 0;i2 < l_b; i2++) {
        sum = a[i2] + b[i2] + carry;
        carry = sum >= base ? 1 : 0;
        r[i2] = sum - carry * base;
      }
      while (i2 < l_a) {
        sum = a[i2] + carry;
        carry = sum === base ? 1 : 0;
        r[i2++] = sum - carry * base;
      }
      if (carry > 0)
        r.push(carry);
      return r;
    }
    function addAny(a, b) {
      if (a.length >= b.length)
        return add(a, b);
      return add(b, a);
    }
    function addSmall(a, carry) {
      var l = a.length, r = new Array(l), base = BASE, sum, i2;
      for (i2 = 0;i2 < l; i2++) {
        sum = a[i2] - base + carry;
        carry = Math.floor(sum / base);
        r[i2] = sum - carry * base;
        carry += 1;
      }
      while (carry > 0) {
        r[i2++] = carry % base;
        carry = Math.floor(carry / base);
      }
      return r;
    }
    BigInteger.prototype.add = function(v) {
      var n = parseValue(v);
      if (this.sign !== n.sign) {
        return this.subtract(n.negate());
      }
      var a = this.value, b = n.value;
      if (n.isSmall) {
        return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
      }
      return new BigInteger(addAny(a, b), this.sign);
    };
    BigInteger.prototype.plus = BigInteger.prototype.add;
    SmallInteger.prototype.add = function(v) {
      var n = parseValue(v);
      var a = this.value;
      if (a < 0 !== n.sign) {
        return this.subtract(n.negate());
      }
      var b = n.value;
      if (n.isSmall) {
        if (isPrecise(a + b))
          return new SmallInteger(a + b);
        b = smallToArray(Math.abs(b));
      }
      return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
    };
    SmallInteger.prototype.plus = SmallInteger.prototype.add;
    NativeBigInt.prototype.add = function(v) {
      return new NativeBigInt(this.value + parseValue(v).value);
    };
    NativeBigInt.prototype.plus = NativeBigInt.prototype.add;
    function subtract(a, b) {
      var a_l = a.length, b_l = b.length, r = new Array(a_l), borrow = 0, base = BASE, i2, difference;
      for (i2 = 0;i2 < b_l; i2++) {
        difference = a[i2] - borrow - b[i2];
        if (difference < 0) {
          difference += base;
          borrow = 1;
        } else
          borrow = 0;
        r[i2] = difference;
      }
      for (i2 = b_l;i2 < a_l; i2++) {
        difference = a[i2] - borrow;
        if (difference < 0)
          difference += base;
        else {
          r[i2++] = difference;
          break;
        }
        r[i2] = difference;
      }
      for (;i2 < a_l; i2++) {
        r[i2] = a[i2];
      }
      trim(r);
      return r;
    }
    function subtractAny(a, b, sign) {
      var value;
      if (compareAbs(a, b) >= 0) {
        value = subtract(a, b);
      } else {
        value = subtract(b, a);
        sign = !sign;
      }
      value = arrayToSmall(value);
      if (typeof value === "number") {
        if (sign)
          value = -value;
        return new SmallInteger(value);
      }
      return new BigInteger(value, sign);
    }
    function subtractSmall(a, b, sign) {
      var l = a.length, r = new Array(l), carry = -b, base = BASE, i2, difference;
      for (i2 = 0;i2 < l; i2++) {
        difference = a[i2] + carry;
        carry = Math.floor(difference / base);
        difference %= base;
        r[i2] = difference < 0 ? difference + base : difference;
      }
      r = arrayToSmall(r);
      if (typeof r === "number") {
        if (sign)
          r = -r;
        return new SmallInteger(r);
      }
      return new BigInteger(r, sign);
    }
    BigInteger.prototype.subtract = function(v) {
      var n = parseValue(v);
      if (this.sign !== n.sign) {
        return this.add(n.negate());
      }
      var a = this.value, b = n.value;
      if (n.isSmall)
        return subtractSmall(a, Math.abs(b), this.sign);
      return subtractAny(a, b, this.sign);
    };
    BigInteger.prototype.minus = BigInteger.prototype.subtract;
    SmallInteger.prototype.subtract = function(v) {
      var n = parseValue(v);
      var a = this.value;
      if (a < 0 !== n.sign) {
        return this.add(n.negate());
      }
      var b = n.value;
      if (n.isSmall) {
        return new SmallInteger(a - b);
      }
      return subtractSmall(b, Math.abs(a), a >= 0);
    };
    SmallInteger.prototype.minus = SmallInteger.prototype.subtract;
    NativeBigInt.prototype.subtract = function(v) {
      return new NativeBigInt(this.value - parseValue(v).value);
    };
    NativeBigInt.prototype.minus = NativeBigInt.prototype.subtract;
    BigInteger.prototype.negate = function() {
      return new BigInteger(this.value, !this.sign);
    };
    SmallInteger.prototype.negate = function() {
      var sign = this.sign;
      var small = new SmallInteger(-this.value);
      small.sign = !sign;
      return small;
    };
    NativeBigInt.prototype.negate = function() {
      return new NativeBigInt(-this.value);
    };
    BigInteger.prototype.abs = function() {
      return new BigInteger(this.value, false);
    };
    SmallInteger.prototype.abs = function() {
      return new SmallInteger(Math.abs(this.value));
    };
    NativeBigInt.prototype.abs = function() {
      return new NativeBigInt(this.value >= 0 ? this.value : -this.value);
    };
    function multiplyLong(a, b) {
      var a_l = a.length, b_l = b.length, l = a_l + b_l, r = createArray(l), base = BASE, product, carry, i2, a_i, b_j;
      for (i2 = 0;i2 < a_l; ++i2) {
        a_i = a[i2];
        for (var j = 0;j < b_l; ++j) {
          b_j = b[j];
          product = a_i * b_j + r[i2 + j];
          carry = Math.floor(product / base);
          r[i2 + j] = product - carry * base;
          r[i2 + j + 1] += carry;
        }
      }
      trim(r);
      return r;
    }
    function multiplySmall(a, b) {
      var l = a.length, r = new Array(l), base = BASE, carry = 0, product, i2;
      for (i2 = 0;i2 < l; i2++) {
        product = a[i2] * b + carry;
        carry = Math.floor(product / base);
        r[i2] = product - carry * base;
      }
      while (carry > 0) {
        r[i2++] = carry % base;
        carry = Math.floor(carry / base);
      }
      return r;
    }
    function shiftLeft(x, n) {
      var r = [];
      while (n-- > 0)
        r.push(0);
      return r.concat(x);
    }
    function multiplyKaratsuba(x, y) {
      var n = Math.max(x.length, y.length);
      if (n <= 30)
        return multiplyLong(x, y);
      n = Math.ceil(n / 2);
      var b = x.slice(n), a = x.slice(0, n), d = y.slice(n), c = y.slice(0, n);
      var ac = multiplyKaratsuba(a, c), bd = multiplyKaratsuba(b, d), abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));
      var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
      trim(product);
      return product;
    }
    function useKaratsuba(l1, l2) {
      return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
    }
    BigInteger.prototype.multiply = function(v) {
      var n = parseValue(v), a = this.value, b = n.value, sign = this.sign !== n.sign, abs;
      if (n.isSmall) {
        if (b === 0)
          return Integer[0];
        if (b === 1)
          return this;
        if (b === -1)
          return this.negate();
        abs = Math.abs(b);
        if (abs < BASE) {
          return new BigInteger(multiplySmall(a, abs), sign);
        }
        b = smallToArray(abs);
      }
      if (useKaratsuba(a.length, b.length))
        return new BigInteger(multiplyKaratsuba(a, b), sign);
      return new BigInteger(multiplyLong(a, b), sign);
    };
    BigInteger.prototype.times = BigInteger.prototype.multiply;
    function multiplySmallAndArray(a, b, sign) {
      if (a < BASE) {
        return new BigInteger(multiplySmall(b, a), sign);
      }
      return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
    }
    SmallInteger.prototype._multiplyBySmall = function(a) {
      if (isPrecise(a.value * this.value)) {
        return new SmallInteger(a.value * this.value);
      }
      return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
    };
    BigInteger.prototype._multiplyBySmall = function(a) {
      if (a.value === 0)
        return Integer[0];
      if (a.value === 1)
        return this;
      if (a.value === -1)
        return this.negate();
      return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
    };
    SmallInteger.prototype.multiply = function(v) {
      return parseValue(v)._multiplyBySmall(this);
    };
    SmallInteger.prototype.times = SmallInteger.prototype.multiply;
    NativeBigInt.prototype.multiply = function(v) {
      return new NativeBigInt(this.value * parseValue(v).value);
    };
    NativeBigInt.prototype.times = NativeBigInt.prototype.multiply;
    function square(a) {
      var l = a.length, r = createArray(l + l), base = BASE, product, carry, i2, a_i, a_j;
      for (i2 = 0;i2 < l; i2++) {
        a_i = a[i2];
        carry = 0 - a_i * a_i;
        for (var j = i2;j < l; j++) {
          a_j = a[j];
          product = 2 * (a_i * a_j) + r[i2 + j] + carry;
          carry = Math.floor(product / base);
          r[i2 + j] = product - carry * base;
        }
        r[i2 + l] = carry;
      }
      trim(r);
      return r;
    }
    BigInteger.prototype.square = function() {
      return new BigInteger(square(this.value), false);
    };
    SmallInteger.prototype.square = function() {
      var value = this.value * this.value;
      if (isPrecise(value))
        return new SmallInteger(value);
      return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
    };
    NativeBigInt.prototype.square = function(v) {
      return new NativeBigInt(this.value * this.value);
    };
    function divMod1(a, b) {
      var a_l = a.length, b_l = b.length, base = BASE, result = createArray(b.length), divisorMostSignificantDigit = b[b_l - 1], lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)), remainder = multiplySmall(a, lambda), divisor = multiplySmall(b, lambda), quotientDigit, shift, carry, borrow, i2, l, q;
      if (remainder.length <= a_l)
        remainder.push(0);
      divisor.push(0);
      divisorMostSignificantDigit = divisor[b_l - 1];
      for (shift = a_l - b_l;shift >= 0; shift--) {
        quotientDigit = base - 1;
        if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
          quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
        }
        carry = 0;
        borrow = 0;
        l = divisor.length;
        for (i2 = 0;i2 < l; i2++) {
          carry += quotientDigit * divisor[i2];
          q = Math.floor(carry / base);
          borrow += remainder[shift + i2] - (carry - q * base);
          carry = q;
          if (borrow < 0) {
            remainder[shift + i2] = borrow + base;
            borrow = -1;
          } else {
            remainder[shift + i2] = borrow;
            borrow = 0;
          }
        }
        while (borrow !== 0) {
          quotientDigit -= 1;
          carry = 0;
          for (i2 = 0;i2 < l; i2++) {
            carry += remainder[shift + i2] - base + divisor[i2];
            if (carry < 0) {
              remainder[shift + i2] = carry + base;
              carry = 0;
            } else {
              remainder[shift + i2] = carry;
              carry = 1;
            }
          }
          borrow += carry;
        }
        result[shift] = quotientDigit;
      }
      remainder = divModSmall(remainder, lambda)[0];
      return [arrayToSmall(result), arrayToSmall(remainder)];
    }
    function divMod2(a, b) {
      var a_l = a.length, b_l = b.length, result = [], part = [], base = BASE, guess, xlen, highx, highy, check;
      while (a_l) {
        part.unshift(a[--a_l]);
        trim(part);
        if (compareAbs(part, b) < 0) {
          result.push(0);
          continue;
        }
        xlen = part.length;
        highx = part[xlen - 1] * base + part[xlen - 2];
        highy = b[b_l - 1] * base + b[b_l - 2];
        if (xlen > b_l) {
          highx = (highx + 1) * base;
        }
        guess = Math.ceil(highx / highy);
        do {
          check = multiplySmall(b, guess);
          if (compareAbs(check, part) <= 0)
            break;
          guess--;
        } while (guess);
        result.push(guess);
        part = subtract(part, check);
      }
      result.reverse();
      return [arrayToSmall(result), arrayToSmall(part)];
    }
    function divModSmall(value, lambda) {
      var length = value.length, quotient = createArray(length), base = BASE, i2, q, remainder, divisor;
      remainder = 0;
      for (i2 = length - 1;i2 >= 0; --i2) {
        divisor = remainder * base + value[i2];
        q = truncate(divisor / lambda);
        remainder = divisor - q * lambda;
        quotient[i2] = q | 0;
      }
      return [quotient, remainder | 0];
    }
    function divModAny(self, v) {
      var value, n = parseValue(v);
      if (supportsNativeBigInt) {
        return [new NativeBigInt(self.value / n.value), new NativeBigInt(self.value % n.value)];
      }
      var a = self.value, b = n.value;
      var quotient;
      if (b === 0)
        throw new Error("Cannot divide by zero");
      if (self.isSmall) {
        if (n.isSmall) {
          return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
        }
        return [Integer[0], self];
      }
      if (n.isSmall) {
        if (b === 1)
          return [self, Integer[0]];
        if (b == -1)
          return [self.negate(), Integer[0]];
        var abs = Math.abs(b);
        if (abs < BASE) {
          value = divModSmall(a, abs);
          quotient = arrayToSmall(value[0]);
          var remainder = value[1];
          if (self.sign)
            remainder = -remainder;
          if (typeof quotient === "number") {
            if (self.sign !== n.sign)
              quotient = -quotient;
            return [new SmallInteger(quotient), new SmallInteger(remainder)];
          }
          return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
        }
        b = smallToArray(abs);
      }
      var comparison = compareAbs(a, b);
      if (comparison === -1)
        return [Integer[0], self];
      if (comparison === 0)
        return [Integer[self.sign === n.sign ? 1 : -1], Integer[0]];
      if (a.length + b.length <= 200)
        value = divMod1(a, b);
      else
        value = divMod2(a, b);
      quotient = value[0];
      var qSign = self.sign !== n.sign, mod = value[1], mSign = self.sign;
      if (typeof quotient === "number") {
        if (qSign)
          quotient = -quotient;
        quotient = new SmallInteger(quotient);
      } else
        quotient = new BigInteger(quotient, qSign);
      if (typeof mod === "number") {
        if (mSign)
          mod = -mod;
        mod = new SmallInteger(mod);
      } else
        mod = new BigInteger(mod, mSign);
      return [quotient, mod];
    }
    BigInteger.prototype.divmod = function(v) {
      var result = divModAny(this, v);
      return {
        quotient: result[0],
        remainder: result[1]
      };
    };
    NativeBigInt.prototype.divmod = SmallInteger.prototype.divmod = BigInteger.prototype.divmod;
    BigInteger.prototype.divide = function(v) {
      return divModAny(this, v)[0];
    };
    NativeBigInt.prototype.over = NativeBigInt.prototype.divide = function(v) {
      return new NativeBigInt(this.value / parseValue(v).value);
    };
    SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;
    BigInteger.prototype.mod = function(v) {
      return divModAny(this, v)[1];
    };
    NativeBigInt.prototype.mod = NativeBigInt.prototype.remainder = function(v) {
      return new NativeBigInt(this.value % parseValue(v).value);
    };
    SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;
    BigInteger.prototype.pow = function(v) {
      var n = parseValue(v), a = this.value, b = n.value, value, x, y;
      if (b === 0)
        return Integer[1];
      if (a === 0)
        return Integer[0];
      if (a === 1)
        return Integer[1];
      if (a === -1)
        return n.isEven() ? Integer[1] : Integer[-1];
      if (n.sign) {
        return Integer[0];
      }
      if (!n.isSmall)
        throw new Error("The exponent " + n.toString() + " is too large.");
      if (this.isSmall) {
        if (isPrecise(value = Math.pow(a, b)))
          return new SmallInteger(truncate(value));
      }
      x = this;
      y = Integer[1];
      while (true) {
        if (b & true) {
          y = y.times(x);
          --b;
        }
        if (b === 0)
          break;
        b /= 2;
        x = x.square();
      }
      return y;
    };
    SmallInteger.prototype.pow = BigInteger.prototype.pow;
    NativeBigInt.prototype.pow = function(v) {
      var n = parseValue(v);
      var a = this.value, b = n.value;
      var _0 = BigInt(0), _1 = BigInt(1), _2 = BigInt(2);
      if (b === _0)
        return Integer[1];
      if (a === _0)
        return Integer[0];
      if (a === _1)
        return Integer[1];
      if (a === BigInt(-1))
        return n.isEven() ? Integer[1] : Integer[-1];
      if (n.isNegative())
        return new NativeBigInt(_0);
      var x = this;
      var y = Integer[1];
      while (true) {
        if ((b & _1) === _1) {
          y = y.times(x);
          --b;
        }
        if (b === _0)
          break;
        b /= _2;
        x = x.square();
      }
      return y;
    };
    BigInteger.prototype.modPow = function(exp, mod) {
      exp = parseValue(exp);
      mod = parseValue(mod);
      if (mod.isZero())
        throw new Error("Cannot take modPow with modulus 0");
      var r = Integer[1], base = this.mod(mod);
      if (exp.isNegative()) {
        exp = exp.multiply(Integer[-1]);
        base = base.modInv(mod);
      }
      while (exp.isPositive()) {
        if (base.isZero())
          return Integer[0];
        if (exp.isOdd())
          r = r.multiply(base).mod(mod);
        exp = exp.divide(2);
        base = base.square().mod(mod);
      }
      return r;
    };
    NativeBigInt.prototype.modPow = SmallInteger.prototype.modPow = BigInteger.prototype.modPow;
    function compareAbs(a, b) {
      if (a.length !== b.length) {
        return a.length > b.length ? 1 : -1;
      }
      for (var i2 = a.length - 1;i2 >= 0; i2--) {
        if (a[i2] !== b[i2])
          return a[i2] > b[i2] ? 1 : -1;
      }
      return 0;
    }
    BigInteger.prototype.compareAbs = function(v) {
      var n = parseValue(v), a = this.value, b = n.value;
      if (n.isSmall)
        return 1;
      return compareAbs(a, b);
    };
    SmallInteger.prototype.compareAbs = function(v) {
      var n = parseValue(v), a = Math.abs(this.value), b = n.value;
      if (n.isSmall) {
        b = Math.abs(b);
        return a === b ? 0 : a > b ? 1 : -1;
      }
      return -1;
    };
    NativeBigInt.prototype.compareAbs = function(v) {
      var a = this.value;
      var b = parseValue(v).value;
      a = a >= 0 ? a : -a;
      b = b >= 0 ? b : -b;
      return a === b ? 0 : a > b ? 1 : -1;
    };
    BigInteger.prototype.compare = function(v) {
      if (v === Infinity) {
        return -1;
      }
      if (v === -Infinity) {
        return 1;
      }
      var n = parseValue(v), a = this.value, b = n.value;
      if (this.sign !== n.sign) {
        return n.sign ? 1 : -1;
      }
      if (n.isSmall) {
        return this.sign ? -1 : 1;
      }
      return compareAbs(a, b) * (this.sign ? -1 : 1);
    };
    BigInteger.prototype.compareTo = BigInteger.prototype.compare;
    SmallInteger.prototype.compare = function(v) {
      if (v === Infinity) {
        return -1;
      }
      if (v === -Infinity) {
        return 1;
      }
      var n = parseValue(v), a = this.value, b = n.value;
      if (n.isSmall) {
        return a == b ? 0 : a > b ? 1 : -1;
      }
      if (a < 0 !== n.sign) {
        return a < 0 ? -1 : 1;
      }
      return a < 0 ? 1 : -1;
    };
    SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;
    NativeBigInt.prototype.compare = function(v) {
      if (v === Infinity) {
        return -1;
      }
      if (v === -Infinity) {
        return 1;
      }
      var a = this.value;
      var b = parseValue(v).value;
      return a === b ? 0 : a > b ? 1 : -1;
    };
    NativeBigInt.prototype.compareTo = NativeBigInt.prototype.compare;
    BigInteger.prototype.equals = function(v) {
      return this.compare(v) === 0;
    };
    NativeBigInt.prototype.eq = NativeBigInt.prototype.equals = SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;
    BigInteger.prototype.notEquals = function(v) {
      return this.compare(v) !== 0;
    };
    NativeBigInt.prototype.neq = NativeBigInt.prototype.notEquals = SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;
    BigInteger.prototype.greater = function(v) {
      return this.compare(v) > 0;
    };
    NativeBigInt.prototype.gt = NativeBigInt.prototype.greater = SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;
    BigInteger.prototype.lesser = function(v) {
      return this.compare(v) < 0;
    };
    NativeBigInt.prototype.lt = NativeBigInt.prototype.lesser = SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;
    BigInteger.prototype.greaterOrEquals = function(v) {
      return this.compare(v) >= 0;
    };
    NativeBigInt.prototype.geq = NativeBigInt.prototype.greaterOrEquals = SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;
    BigInteger.prototype.lesserOrEquals = function(v) {
      return this.compare(v) <= 0;
    };
    NativeBigInt.prototype.leq = NativeBigInt.prototype.lesserOrEquals = SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;
    BigInteger.prototype.isEven = function() {
      return (this.value[0] & 1) === 0;
    };
    SmallInteger.prototype.isEven = function() {
      return (this.value & 1) === 0;
    };
    NativeBigInt.prototype.isEven = function() {
      return (this.value & BigInt(1)) === BigInt(0);
    };
    BigInteger.prototype.isOdd = function() {
      return (this.value[0] & 1) === 1;
    };
    SmallInteger.prototype.isOdd = function() {
      return (this.value & 1) === 1;
    };
    NativeBigInt.prototype.isOdd = function() {
      return (this.value & BigInt(1)) === BigInt(1);
    };
    BigInteger.prototype.isPositive = function() {
      return !this.sign;
    };
    SmallInteger.prototype.isPositive = function() {
      return this.value > 0;
    };
    NativeBigInt.prototype.isPositive = SmallInteger.prototype.isPositive;
    BigInteger.prototype.isNegative = function() {
      return this.sign;
    };
    SmallInteger.prototype.isNegative = function() {
      return this.value < 0;
    };
    NativeBigInt.prototype.isNegative = SmallInteger.prototype.isNegative;
    BigInteger.prototype.isUnit = function() {
      return false;
    };
    SmallInteger.prototype.isUnit = function() {
      return Math.abs(this.value) === 1;
    };
    NativeBigInt.prototype.isUnit = function() {
      return this.abs().value === BigInt(1);
    };
    BigInteger.prototype.isZero = function() {
      return false;
    };
    SmallInteger.prototype.isZero = function() {
      return this.value === 0;
    };
    NativeBigInt.prototype.isZero = function() {
      return this.value === BigInt(0);
    };
    BigInteger.prototype.isDivisibleBy = function(v) {
      var n = parseValue(v);
      if (n.isZero())
        return false;
      if (n.isUnit())
        return true;
      if (n.compareAbs(2) === 0)
        return this.isEven();
      return this.mod(n).isZero();
    };
    NativeBigInt.prototype.isDivisibleBy = SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;
    function isBasicPrime(v) {
      var n = v.abs();
      if (n.isUnit())
        return false;
      if (n.equals(2) || n.equals(3) || n.equals(5))
        return true;
      if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5))
        return false;
      if (n.lesser(49))
        return true;
    }
    function millerRabinTest(n, a) {
      var nPrev = n.prev(), b = nPrev, r = 0, d, t, i2, x;
      while (b.isEven())
        b = b.divide(2), r++;
      next:
        for (i2 = 0;i2 < a.length; i2++) {
          if (n.lesser(a[i2]))
            continue;
          x = bigInt(a[i2]).modPow(b, n);
          if (x.isUnit() || x.equals(nPrev))
            continue;
          for (d = r - 1;d != 0; d--) {
            x = x.square().mod(n);
            if (x.isUnit())
              return false;
            if (x.equals(nPrev))
              continue next;
          }
          return false;
        }
      return true;
    }
    BigInteger.prototype.isPrime = function(strict) {
      var isPrime = isBasicPrime(this);
      if (isPrime !== undefined2)
        return isPrime;
      var n = this.abs();
      var bits = n.bitLength();
      if (bits <= 64)
        return millerRabinTest(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
      var logN = Math.log(2) * bits.toJSNumber();
      var t = Math.ceil(strict === true ? 2 * Math.pow(logN, 2) : logN);
      for (var a = [], i2 = 0;i2 < t; i2++) {
        a.push(bigInt(i2 + 2));
      }
      return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isPrime = SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;
    BigInteger.prototype.isProbablePrime = function(iterations, rng) {
      var isPrime = isBasicPrime(this);
      if (isPrime !== undefined2)
        return isPrime;
      var n = this.abs();
      var t = iterations === undefined2 ? 5 : iterations;
      for (var a = [], i2 = 0;i2 < t; i2++) {
        a.push(bigInt.randBetween(2, n.minus(2), rng));
      }
      return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isProbablePrime = SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;
    BigInteger.prototype.modInv = function(n) {
      var { zero: t, one: newT } = bigInt, r = parseValue(n), newR = this.abs(), q, lastT, lastR;
      while (!newR.isZero()) {
        q = r.divide(newR);
        lastT = t;
        lastR = r;
        t = newT;
        r = newR;
        newT = lastT.subtract(q.multiply(newT));
        newR = lastR.subtract(q.multiply(newR));
      }
      if (!r.isUnit())
        throw new Error(this.toString() + " and " + n.toString() + " are not co-prime");
      if (t.compare(0) === -1) {
        t = t.add(n);
      }
      if (this.isNegative()) {
        return t.negate();
      }
      return t;
    };
    NativeBigInt.prototype.modInv = SmallInteger.prototype.modInv = BigInteger.prototype.modInv;
    BigInteger.prototype.next = function() {
      var value = this.value;
      if (this.sign) {
        return subtractSmall(value, 1, this.sign);
      }
      return new BigInteger(addSmall(value, 1), this.sign);
    };
    SmallInteger.prototype.next = function() {
      var value = this.value;
      if (value + 1 < MAX_INT)
        return new SmallInteger(value + 1);
      return new BigInteger(MAX_INT_ARR, false);
    };
    NativeBigInt.prototype.next = function() {
      return new NativeBigInt(this.value + BigInt(1));
    };
    BigInteger.prototype.prev = function() {
      var value = this.value;
      if (this.sign) {
        return new BigInteger(addSmall(value, 1), true);
      }
      return subtractSmall(value, 1, this.sign);
    };
    SmallInteger.prototype.prev = function() {
      var value = this.value;
      if (value - 1 > -MAX_INT)
        return new SmallInteger(value - 1);
      return new BigInteger(MAX_INT_ARR, true);
    };
    NativeBigInt.prototype.prev = function() {
      return new NativeBigInt(this.value - BigInt(1));
    };
    var powersOfTwo = [1];
    while (2 * powersOfTwo[powersOfTwo.length - 1] <= BASE)
      powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
    var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];
    function shift_isSmall(n) {
      return Math.abs(n) <= BASE;
    }
    BigInteger.prototype.shiftLeft = function(v) {
      var n = parseValue(v).toJSNumber();
      if (!shift_isSmall(n)) {
        throw new Error(String(n) + " is too large for shifting.");
      }
      if (n < 0)
        return this.shiftRight(-n);
      var result = this;
      if (result.isZero())
        return result;
      while (n >= powers2Length) {
        result = result.multiply(highestPower2);
        n -= powers2Length - 1;
      }
      return result.multiply(powersOfTwo[n]);
    };
    NativeBigInt.prototype.shiftLeft = SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;
    BigInteger.prototype.shiftRight = function(v) {
      var remQuo;
      var n = parseValue(v).toJSNumber();
      if (!shift_isSmall(n)) {
        throw new Error(String(n) + " is too large for shifting.");
      }
      if (n < 0)
        return this.shiftLeft(-n);
      var result = this;
      while (n >= powers2Length) {
        if (result.isZero() || result.isNegative() && result.isUnit())
          return result;
        remQuo = divModAny(result, highestPower2);
        result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
        n -= powers2Length - 1;
      }
      remQuo = divModAny(result, powersOfTwo[n]);
      return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
    };
    NativeBigInt.prototype.shiftRight = SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;
    function bitwise(x, y, fn) {
      y = parseValue(y);
      var xSign = x.isNegative(), ySign = y.isNegative();
      var xRem = xSign ? x.not() : x, yRem = ySign ? y.not() : y;
      var xDigit = 0, yDigit = 0;
      var xDivMod = null, yDivMod = null;
      var result = [];
      while (!xRem.isZero() || !yRem.isZero()) {
        xDivMod = divModAny(xRem, highestPower2);
        xDigit = xDivMod[1].toJSNumber();
        if (xSign) {
          xDigit = highestPower2 - 1 - xDigit;
        }
        yDivMod = divModAny(yRem, highestPower2);
        yDigit = yDivMod[1].toJSNumber();
        if (ySign) {
          yDigit = highestPower2 - 1 - yDigit;
        }
        xRem = xDivMod[0];
        yRem = yDivMod[0];
        result.push(fn(xDigit, yDigit));
      }
      var sum = fn(xSign ? 1 : 0, ySign ? 1 : 0) !== 0 ? bigInt(-1) : bigInt(0);
      for (var i2 = result.length - 1;i2 >= 0; i2 -= 1) {
        sum = sum.multiply(highestPower2).add(bigInt(result[i2]));
      }
      return sum;
    }
    BigInteger.prototype.not = function() {
      return this.negate().prev();
    };
    NativeBigInt.prototype.not = SmallInteger.prototype.not = BigInteger.prototype.not;
    BigInteger.prototype.and = function(n) {
      return bitwise(this, n, function(a, b) {
        return a & b;
      });
    };
    NativeBigInt.prototype.and = SmallInteger.prototype.and = BigInteger.prototype.and;
    BigInteger.prototype.or = function(n) {
      return bitwise(this, n, function(a, b) {
        return a | b;
      });
    };
    NativeBigInt.prototype.or = SmallInteger.prototype.or = BigInteger.prototype.or;
    BigInteger.prototype.xor = function(n) {
      return bitwise(this, n, function(a, b) {
        return a ^ b;
      });
    };
    NativeBigInt.prototype.xor = SmallInteger.prototype.xor = BigInteger.prototype.xor;
    var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
    function roughLOB(n) {
      var v = n.value, x = typeof v === "number" ? v | LOBMASK_I : typeof v === "bigint" ? v | BigInt(LOBMASK_I) : v[0] + v[1] * BASE | LOBMASK_BI;
      return x & -x;
    }
    function integerLogarithm(value, base) {
      if (base.compareTo(value) <= 0) {
        var tmp = integerLogarithm(value, base.square(base));
        var p = tmp.p;
        var e = tmp.e;
        var t = p.multiply(base);
        return t.compareTo(value) <= 0 ? { p: t, e: e * 2 + 1 } : { p, e: e * 2 };
      }
      return { p: bigInt(1), e: 0 };
    }
    BigInteger.prototype.bitLength = function() {
      var n = this;
      if (n.compareTo(bigInt(0)) < 0) {
        n = n.negate().subtract(bigInt(1));
      }
      if (n.compareTo(bigInt(0)) === 0) {
        return bigInt(0);
      }
      return bigInt(integerLogarithm(n, bigInt(2)).e).add(bigInt(1));
    };
    NativeBigInt.prototype.bitLength = SmallInteger.prototype.bitLength = BigInteger.prototype.bitLength;
    function max(a, b) {
      a = parseValue(a);
      b = parseValue(b);
      return a.greater(b) ? a : b;
    }
    function min(a, b) {
      a = parseValue(a);
      b = parseValue(b);
      return a.lesser(b) ? a : b;
    }
    function gcd(a, b) {
      a = parseValue(a).abs();
      b = parseValue(b).abs();
      if (a.equals(b))
        return a;
      if (a.isZero())
        return b;
      if (b.isZero())
        return a;
      var c = Integer[1], d, t;
      while (a.isEven() && b.isEven()) {
        d = min(roughLOB(a), roughLOB(b));
        a = a.divide(d);
        b = b.divide(d);
        c = c.multiply(d);
      }
      while (a.isEven()) {
        a = a.divide(roughLOB(a));
      }
      do {
        while (b.isEven()) {
          b = b.divide(roughLOB(b));
        }
        if (a.greater(b)) {
          t = b;
          b = a;
          a = t;
        }
        b = b.subtract(a);
      } while (!b.isZero());
      return c.isUnit() ? a : a.multiply(c);
    }
    function lcm(a, b) {
      a = parseValue(a).abs();
      b = parseValue(b).abs();
      return a.divide(gcd(a, b)).multiply(b);
    }
    function randBetween(a, b, rng) {
      a = parseValue(a);
      b = parseValue(b);
      var usedRNG = rng || Math.random;
      var low = min(a, b), high = max(a, b);
      var range = high.subtract(low).add(1);
      if (range.isSmall)
        return low.add(Math.floor(usedRNG() * range));
      var digits = toBase(range, BASE).value;
      var result = [], restricted = true;
      for (var i2 = 0;i2 < digits.length; i2++) {
        var top = restricted ? digits[i2] + (i2 + 1 < digits.length ? digits[i2 + 1] / BASE : 0) : BASE;
        var digit = truncate(usedRNG() * top);
        result.push(digit);
        if (digit < digits[i2])
          restricted = false;
      }
      return low.add(Integer.fromArray(result, BASE, false));
    }
    var parseBase = function(text, base, alphabet, caseSensitive) {
      alphabet = alphabet || DEFAULT_ALPHABET;
      text = String(text);
      if (!caseSensitive) {
        text = text.toLowerCase();
        alphabet = alphabet.toLowerCase();
      }
      var length = text.length;
      var i2;
      var absBase = Math.abs(base);
      var alphabetValues = {};
      for (i2 = 0;i2 < alphabet.length; i2++) {
        alphabetValues[alphabet[i2]] = i2;
      }
      for (i2 = 0;i2 < length; i2++) {
        var c = text[i2];
        if (c === "-")
          continue;
        if (c in alphabetValues) {
          if (alphabetValues[c] >= absBase) {
            if (c === "1" && absBase === 1)
              continue;
            throw new Error(c + " is not a valid digit in base " + base + ".");
          }
        }
      }
      base = parseValue(base);
      var digits = [];
      var isNegative = text[0] === "-";
      for (i2 = isNegative ? 1 : 0;i2 < text.length; i2++) {
        var c = text[i2];
        if (c in alphabetValues)
          digits.push(parseValue(alphabetValues[c]));
        else if (c === "<") {
          var start = i2;
          do {
            i2++;
          } while (text[i2] !== ">" && i2 < text.length);
          digits.push(parseValue(text.slice(start + 1, i2)));
        } else
          throw new Error(c + " is not a valid character");
      }
      return parseBaseFromArray(digits, base, isNegative);
    };
    function parseBaseFromArray(digits, base, isNegative) {
      var val = Integer[0], pow = Integer[1], i2;
      for (i2 = digits.length - 1;i2 >= 0; i2--) {
        val = val.add(digits[i2].times(pow));
        pow = pow.times(base);
      }
      return isNegative ? val.negate() : val;
    }
    function stringify(digit, alphabet) {
      alphabet = alphabet || DEFAULT_ALPHABET;
      if (digit < alphabet.length) {
        return alphabet[digit];
      }
      return "<" + digit + ">";
    }
    function toBase(n, base) {
      base = bigInt(base);
      if (base.isZero()) {
        if (n.isZero())
          return { value: [0], isNegative: false };
        throw new Error("Cannot convert nonzero numbers to base 0.");
      }
      if (base.equals(-1)) {
        if (n.isZero())
          return { value: [0], isNegative: false };
        if (n.isNegative())
          return {
            value: [].concat.apply([], Array.apply(null, Array(-n.toJSNumber())).map(Array.prototype.valueOf, [1, 0])),
            isNegative: false
          };
        var arr = Array.apply(null, Array(n.toJSNumber() - 1)).map(Array.prototype.valueOf, [0, 1]);
        arr.unshift([1]);
        return {
          value: [].concat.apply([], arr),
          isNegative: false
        };
      }
      var neg = false;
      if (n.isNegative() && base.isPositive()) {
        neg = true;
        n = n.abs();
      }
      if (base.isUnit()) {
        if (n.isZero())
          return { value: [0], isNegative: false };
        return {
          value: Array.apply(null, Array(n.toJSNumber())).map(Number.prototype.valueOf, 1),
          isNegative: neg
        };
      }
      var out = [];
      var left = n, divmod;
      while (left.isNegative() || left.compareAbs(base) >= 0) {
        divmod = left.divmod(base);
        left = divmod.quotient;
        var digit = divmod.remainder;
        if (digit.isNegative()) {
          digit = base.minus(digit).abs();
          left = left.next();
        }
        out.push(digit.toJSNumber());
      }
      out.push(left.toJSNumber());
      return { value: out.reverse(), isNegative: neg };
    }
    function toBaseString(n, base, alphabet) {
      var arr = toBase(n, base);
      return (arr.isNegative ? "-" : "") + arr.value.map(function(x) {
        return stringify(x, alphabet);
      }).join("");
    }
    BigInteger.prototype.toArray = function(radix) {
      return toBase(this, radix);
    };
    SmallInteger.prototype.toArray = function(radix) {
      return toBase(this, radix);
    };
    NativeBigInt.prototype.toArray = function(radix) {
      return toBase(this, radix);
    };
    BigInteger.prototype.toString = function(radix, alphabet) {
      if (radix === undefined2)
        radix = 10;
      if (radix !== 10 || alphabet)
        return toBaseString(this, radix, alphabet);
      var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
      while (--l >= 0) {
        digit = String(v[l]);
        str += zeros.slice(digit.length) + digit;
      }
      var sign = this.sign ? "-" : "";
      return sign + str;
    };
    SmallInteger.prototype.toString = function(radix, alphabet) {
      if (radix === undefined2)
        radix = 10;
      if (radix != 10 || alphabet)
        return toBaseString(this, radix, alphabet);
      return String(this.value);
    };
    NativeBigInt.prototype.toString = SmallInteger.prototype.toString;
    NativeBigInt.prototype.toJSON = BigInteger.prototype.toJSON = SmallInteger.prototype.toJSON = function() {
      return this.toString();
    };
    BigInteger.prototype.valueOf = function() {
      return parseInt(this.toString(), 10);
    };
    BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;
    SmallInteger.prototype.valueOf = function() {
      return this.value;
    };
    SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;
    NativeBigInt.prototype.valueOf = NativeBigInt.prototype.toJSNumber = function() {
      return parseInt(this.toString(), 10);
    };
    function parseStringValue(v) {
      if (isPrecise(+v)) {
        var x = +v;
        if (x === truncate(x))
          return supportsNativeBigInt ? new NativeBigInt(BigInt(x)) : new SmallInteger(x);
        throw new Error("Invalid integer: " + v);
      }
      var sign = v[0] === "-";
      if (sign)
        v = v.slice(1);
      var split = v.split(/e/i);
      if (split.length > 2)
        throw new Error("Invalid integer: " + split.join("e"));
      if (split.length === 2) {
        var exp = split[1];
        if (exp[0] === "+")
          exp = exp.slice(1);
        exp = +exp;
        if (exp !== truncate(exp) || !isPrecise(exp))
          throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
        var text = split[0];
        var decimalPlace = text.indexOf(".");
        if (decimalPlace >= 0) {
          exp -= text.length - decimalPlace - 1;
          text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
        }
        if (exp < 0)
          throw new Error("Cannot include negative exponent part for integers");
        text += new Array(exp + 1).join("0");
        v = text;
      }
      var isValid = /^([0-9][0-9]*)$/.test(v);
      if (!isValid)
        throw new Error("Invalid integer: " + v);
      if (supportsNativeBigInt) {
        return new NativeBigInt(BigInt(sign ? "-" + v : v));
      }
      var r = [], max2 = v.length, l = LOG_BASE, min2 = max2 - l;
      while (max2 > 0) {
        r.push(+v.slice(min2, max2));
        min2 -= l;
        if (min2 < 0)
          min2 = 0;
        max2 -= l;
      }
      trim(r);
      return new BigInteger(r, sign);
    }
    function parseNumberValue(v) {
      if (supportsNativeBigInt) {
        return new NativeBigInt(BigInt(v));
      }
      if (isPrecise(v)) {
        if (v !== truncate(v))
          throw new Error(v + " is not an integer.");
        return new SmallInteger(v);
      }
      return parseStringValue(v.toString());
    }
    function parseValue(v) {
      if (typeof v === "number") {
        return parseNumberValue(v);
      }
      if (typeof v === "string") {
        return parseStringValue(v);
      }
      if (typeof v === "bigint") {
        return new NativeBigInt(v);
      }
      return v;
    }
    for (var i = 0;i < 1000; i++) {
      Integer[i] = parseValue(i);
      if (i > 0)
        Integer[-i] = parseValue(-i);
    }
    Integer.one = Integer[1];
    Integer.zero = Integer[0];
    Integer.minusOne = Integer[-1];
    Integer.max = max;
    Integer.min = min;
    Integer.gcd = gcd;
    Integer.lcm = lcm;
    Integer.isInstance = function(x) {
      return x instanceof BigInteger || x instanceof SmallInteger || x instanceof NativeBigInt;
    };
    Integer.randBetween = randBetween;
    Integer.fromArray = function(digits, base, isNegative) {
      return parseBaseFromArray(digits.map(parseValue), parseValue(base || 10), isNegative);
    };
    return Integer;
  }();
  if (typeof module2 !== "undefined" && module2.hasOwnProperty("exports")) {
    module2.exports = bigInt;
  }
  if (typeof define === "function" && define.amd) {
    define(function() {
      return bigInt;
    });
  }
});

// node_modules/cifrante/dist/cifrante.node.cjs
var require_cifrante_node = __commonJS((exports2) => {
  var __filename = "node_modules/cifrante/dist/cifrante.node.cjs";
  Object.defineProperties(exports2, {
    __esModule: { value: true },
    [Symbol.toStringTag]: { value: "Module" }
  });
  var __create2 = Object.create;
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __getProtoOf2 = Object.getPrototypeOf;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function")
      for (var keys = __getOwnPropNames2(from), i = 0, n = keys.length, key;i < n; i++) {
        key = keys[i];
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, {
            get: ((k) => from[k]).bind(null, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
      }
    return to;
  };
  var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", {
    value: mod,
    enumerable: true
  }) : target, mod));
  var node_crypto = require("node:crypto");
  node_crypto = __toESM2(node_crypto, 1);
  var node_module = require("node:module");
  var CifranteError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "CifranteError";
    }
  };
  var InvalidInputError = class extends CifranteError {
    constructor(..._args) {
      super(..._args);
      this.name = "InvalidInputError";
    }
  };
  var UnsupportedError = class extends CifranteError {
    constructor(..._args2) {
      super(..._args2);
      this.name = "UnsupportedError";
    }
  };
  var InvalidKeyError = class extends CifranteError {
    constructor(..._args3) {
      super(..._args3);
      this.name = "InvalidKeyError";
    }
  };
  var InvalidIVError = class extends CifranteError {
    constructor(..._args4) {
      super(..._args4);
      this.name = "InvalidIVError";
    }
  };
  var InvalidNonceError = class extends CifranteError {
    constructor(..._args5) {
      super(..._args5);
      this.name = "InvalidNonceError";
    }
  };
  var AuthenticationError = class extends CifranteError {
    constructor(..._args6) {
      super(..._args6);
      this.name = "AuthenticationError";
    }
  };
  function lazy(create) {
    let initialized = false;
    let value;
    return () => {
      if (!initialized) {
        value = create();
        initialized = true;
      }
      return value;
    };
  }
  function inverseMod(value, modulus) {
    let a = modulus;
    let b = value;
    let x = 0n;
    let y = 1n;
    while (b !== 0n) {
      const quotient = a / b;
      [a, b] = [b, a - quotient * b];
      [x, y] = [y, x - quotient * y];
    }
    if (a !== 1n)
      throw new InvalidKeyError("Invalid RSA factors or private exponent");
    return (x % modulus + modulus) % modulus;
  }
  function rsaJwk(key, encode) {
    const { n, e, d, p, q } = key;
    if (d === undefined)
      return e === undefined ? undefined : {
        kty: "RSA",
        n: encode(n),
        e: encode(e)
      };
    if (p === undefined || q === undefined)
      return;
    let a = p - 1n;
    let b = q - 1n;
    while (b !== 0n)
      [a, b] = [b, a % b];
    const lambda = (p - 1n) / a * (q - 1n);
    return {
      kty: "RSA",
      n: encode(n),
      e: encode(inverseMod(d, lambda)),
      d: encode(d),
      p: encode(p),
      q: encode(q),
      dp: encode(d % (p - 1n)),
      dq: encode(d % (q - 1n)),
      qi: encode(inverseMod(q, p))
    };
  }
  var hashes;
  var ciphers;
  function supports(name, available, kind) {
    if (available.has(name))
      return true;
    if ((0, node_crypto.getFips)())
      throw new UnsupportedError(`${kind} ${name} is unavailable under the platform's FIPS policy`);
    return false;
  }
  function supportsHash(name) {
    hashes ?? (hashes = new Set((0, node_crypto.getHashes)().map((name2) => name2.toLowerCase())));
    return supports(name, hashes, "Hash");
  }
  function supportsCipher(name) {
    ciphers ?? (ciphers = new Set((0, node_crypto.getCiphers)().map((name2) => name2.toLowerCase())));
    return supports(name, ciphers, "Cipher");
  }
  function fillRandom(bytes2) {
    for (let offset = 0;offset < bytes2.length; offset += 2147483647)
      (0, node_crypto.randomFillSync)(bytes2.subarray(offset, offset + 2147483647));
  }
  function adaptHash(hash) {
    return {
      update(data) {
        hash.update(data);
      },
      digest() {
        return new Uint8Array(hash.digest());
      }
    };
  }
  var addon = /* @__PURE__ */ lazy(() => {
    if (process.env.CIFRANTE_NATIVE === "0")
      return;
    const load2 = (0, node_module.createRequire)(require("url").pathToFileURL(__filename).href);
    const base = `@cifrante/${process.platform}-${process.arch}`;
    const candidates = process.platform === "linux" ? [`${base}-gnu`, `${base}-musl`] : [base];
    for (const candidate of candidates)
      try {
        const module3 = load2(candidate);
        if (module3.supported())
          return module3;
      } catch {
        continue;
      }
  });
  function nativeIge() {
    return addon();
  }
  function nativeHash(name) {
    return supportsHash(name) ? adaptHash((0, node_crypto.createHash)(name)) : undefined;
  }
  function nativeHmac(name, key) {
    return supportsHash(name) ? adaptHash((0, node_crypto.createHmac)(name, key)) : undefined;
  }
  function nativeDigestAvailable(name) {
    return supportsHash(name);
  }
  function nativeDigestSync(name, data) {
    if (!supportsHash(name))
      return;
    const digest = Reflect.get(node_crypto, "hash");
    return new Uint8Array(typeof digest === "function" ? digest(name, data, "buffer") : (0, node_crypto.createHash)(name).update(data).digest());
  }
  function nativeMacAvailable(name, _secret) {
    return supportsHash(name);
  }
  async function nativeDigest(name, data) {
    if (!supportsHash(name))
      return;
    const digest = Reflect.get(node_crypto, "hash");
    const result = typeof digest === "function" ? digest(name, data, "buffer") : (0, node_crypto.createHash)(name).update(data).digest();
    return new Uint8Array(result);
  }
  async function nativeMac(name, key, data) {
    if (!supportsHash(name))
      return;
    return new Uint8Array((0, node_crypto.createHmac)(name, key).update(data).digest());
  }
  function nativeEqual(a, b) {
    return a.length === b.length && (0, node_crypto.timingSafeEqual)(a, b);
  }
  function callbackBytes(run) {
    return new Promise((resolve, reject) => {
      run((error, derived) => {
        if (error)
          reject(error);
        else
          resolve(ArrayBuffer.isView(derived) ? Uint8Array.from(derived) : new Uint8Array(derived));
      });
    });
  }
  async function nativePbkdf2(hash, password, salt, iterations, length) {
    if (!supportsHash(hash) || iterations > 2147483647 || length > 2147483647)
      return;
    if (!length)
      return /* @__PURE__ */ new Uint8Array;
    return callbackBytes((callback) => (0, node_crypto.pbkdf2)(password, salt, iterations, length, hash, callback));
  }
  async function nativeHkdf(hash, input, salt, info, length) {
    if (!supportsHash(hash) || info.length > 1024)
      return;
    if (!length)
      return /* @__PURE__ */ new Uint8Array;
    return callbackBytes((callback) => (0, node_crypto.hkdf)(hash, input, salt, info, length, callback));
  }
  function concat(first, second) {
    const result = new Uint8Array(first.length + second.length);
    result.set(first);
    result.set(second, first.length);
    return result;
  }
  function nativeCipher(mode, key) {
    const name = `aes-${key.length * 8}-${mode}`;
    const prepare2 = lazy(() => supportsCipher(name) ? (0, node_crypto.createSecretKey)(key) : undefined);
    function operate2(iv, data, decrypt) {
      const secret = prepare2();
      if (secret === undefined)
        return;
      const cipher = decrypt ? (0, node_crypto.createDecipheriv)(name, secret, iv) : (0, node_crypto.createCipheriv)(name, secret, iv);
      const output = cipher.update(data);
      try {
        return concat(output, cipher.final());
      } catch (error) {
        if (decrypt && mode === "cbc") {
          output.fill(0);
          throw new AuthenticationError("Invalid CBC padding");
        }
        throw error;
      }
    }
    function blocks(iv, data) {
      if (mode !== "cbc" || !supportsCipher(name))
        return;
      const cipher = (0, node_crypto.createCipheriv)(name, key, iv);
      cipher.setAutoPadding(false);
      const head = cipher.update(data);
      const tail = cipher.final();
      return tail.length === 0 ? head : concat(head, tail);
    }
    function stream(iv) {
      if (mode !== "ctr" || !supportsCipher(name))
        return;
      const cipher = (0, node_crypto.createCipheriv)(name, key, iv);
      return {
        update(data) {
          const output = cipher.update(data);
          return new Uint8Array(output.buffer, output.byteOffset, output.byteLength);
        },
        dispose() {
          cipher.final();
        }
      };
    }
    return {
      available: () => supportsCipher(name),
      stream,
      encrypt: async (iv, data) => operate2(iv, data, false),
      decrypt: async (iv, data) => operate2(iv, data, true),
      encryptSync: (iv, data) => operate2(iv, data, false),
      decryptSync: (iv, data) => operate2(iv, data, true),
      encryptBlocks: async (iv, data) => blocks(iv, data),
      encryptBlocksSync: blocks
    };
  }
  function nativeGcm(key) {
    const name = `aes-${key.length * 8}-gcm`;
    const prepare2 = lazy(() => supportsCipher(name) ? (0, node_crypto.createSecretKey)(key) : undefined);
    function seal(nonce, data, aad, tagLength) {
      const secret = prepare2();
      if (secret === undefined || nonce.length > 128)
        return;
      const cipher = (0, node_crypto.createCipheriv)(name, secret, nonce, { authTagLength: tagLength });
      cipher.setAAD(aad);
      return {
        ciphertext: concat(cipher.update(data), cipher.final()),
        tag: new Uint8Array(cipher.getAuthTag())
      };
    }
    function open(nonce, data, aad, tag) {
      const secret = prepare2();
      if (secret === undefined || nonce.length > 128)
        return;
      const cipher = (0, node_crypto.createDecipheriv)(name, secret, nonce, { authTagLength: tag.length });
      cipher.setAAD(aad);
      cipher.setAuthTag(tag);
      const output = cipher.update(data);
      try {
        return concat(output, cipher.final());
      } catch {
        output.fill(0);
        throw new AuthenticationError("GCM authentication failed");
      }
    }
    return {
      available: (nonce) => supportsCipher(name) && nonce.length <= 128,
      encrypt: async (nonce, data, aad, tagLength) => seal(nonce, data, aad, tagLength),
      decrypt: async (nonce, data, aad, tag) => open(nonce, data, aad, tag),
      encryptSync: seal,
      decryptSync: open
    };
  }
  function integerBase64Url(value) {
    const hex = value.toString(16);
    return Buffer.from(hex.length % 2 ? `0${hex}` : hex, "hex").toString("base64url");
  }
  function createRsaKey(key) {
    if (key.n < 1n << 511n)
      return;
    const jwk = rsaJwk(key, integerBase64Url);
    if (jwk === undefined)
      return;
    return key.d === undefined ? (0, node_crypto.createPublicKey)({
      key: jwk,
      format: "jwk"
    }) : (0, node_crypto.createPrivateKey)({
      key: jwk,
      format: "jwk"
    });
  }
  function nativeOaep(key, hash, label) {
    const prepare2 = lazy(() => supportsHash(hash) ? createRsaKey(key) : undefined);
    return {
      async encrypt(data) {
        const secret = prepare2();
        if (secret === undefined)
          return;
        return new Uint8Array((0, node_crypto.publicEncrypt)({
          key: secret,
          padding: node_crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: hash,
          oaepLabel: label
        }, data));
      },
      async decrypt(data) {
        const secret = prepare2();
        if (secret === undefined)
          return;
        try {
          return new Uint8Array((0, node_crypto.privateDecrypt)({
            key: secret,
            padding: node_crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: hash,
            oaepLabel: label
          }, data));
        } catch (error) {
          if (error !== null && typeof error === "object" && "code" in error && (error.code === "ERR_OSSL_RSA_OAEP_DECODING_ERROR" || error.code === "ERR_OSSL_OAEP_DECODING_ERROR"))
            throw new AuthenticationError("RSA-OAEP decryption failed");
          throw error;
        }
      }
    };
  }
  function nativeRsaPublic(n, e, data) {
    const key = createRsaKey({
      n,
      e
    });
    return key === undefined ? undefined : new Uint8Array((0, node_crypto.publicEncrypt)({
      key,
      padding: node_crypto.constants.RSA_NO_PADDING
    }, data));
  }
  function nativeRsaPrivate(n, d, p, q, data) {
    const key = createRsaKey({
      n,
      d,
      p,
      q
    });
    return key === undefined ? undefined : new Uint8Array((0, node_crypto.privateDecrypt)({
      key,
      padding: node_crypto.constants.RSA_NO_PADDING
    }, data));
  }
  function assertLength(value, name = "Length") {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new InvalidInputError(`${name} must be a non-negative safe integer`);
  }
  var arrayBufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get;
  function toBinary(data) {
    try {
      if (ArrayBuffer.isView(data))
        return new Uint8Array(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      arrayBufferLength.call(data);
      return new Uint8Array(new Uint8Array(data));
    } catch {
      throw new InvalidInputError("Expected an ArrayBuffer or an ArrayBuffer view");
    }
  }
  function toBytes(data) {
    return typeof data === "string" ? encodeUtf8(data) : toBinary(data);
  }
  function toBinaryView(data) {
    try {
      if (ArrayBuffer.isView(data))
        return data instanceof Uint8Array && data.byteLength > 0 ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      arrayBufferLength.call(data);
      return new Uint8Array(data);
    } catch {
      throw new InvalidInputError("Expected an ArrayBuffer or an ArrayBuffer view");
    }
  }
  function toBytesView(data) {
    return typeof data === "string" ? encodeUtf8(data) : toBinaryView(data);
  }
  function bytesToBigInt(data) {
    let value = 0n;
    for (const byte of data)
      value = value << 8n | BigInt(byte);
    return value;
  }
  function bigIntToBytes(value, length = Math.ceil(value.toString(16).length / 2)) {
    const result = new Uint8Array(length);
    for (let i = length - 1;i >= 0; i--) {
      result[i] = Number(value & 255n);
      value >>= 8n;
    }
    return result;
  }
  function encodeHex(data) {
    let result = "";
    for (const byte of toBinary(data))
      result += byte.toString(16).padStart(2, "0");
    return result;
  }
  function decodeHex(data) {
    if (typeof data !== "string" || data.length % 2 !== 0 || /[^0-9a-f]/i.test(data))
      throw new InvalidInputError("Expected an even number of hexadecimal characters");
    const result = new Uint8Array(data.length / 2);
    for (let i = 0;i < result.length; i++)
      result[i] = Number.parseInt(data.slice(i * 2, i * 2 + 2), 16);
    return result;
  }
  var BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function encodeBase64(data) {
    const value = toBinary(data);
    let result = "";
    for (let i = 0;i < value.length; i += 3) {
      const a = value[i];
      const b = value[i + 1] ?? 0;
      const c = value[i + 2] ?? 0;
      result += BASE64[a >>> 2];
      result += BASE64[(a & 3) << 4 | b >>> 4];
      result += i + 1 < value.length ? BASE64[(b & 15) << 2 | c >>> 6] : "=";
      result += i + 2 < value.length ? BASE64[c & 63] : "=";
    }
    return result;
  }
  function decodeBase64(data) {
    if (typeof data !== "string" || data.length % 4 !== 0)
      throw new InvalidInputError("Expected standard Base64 with canonical padding");
    const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
    if (/[^A-Za-z0-9+/]/.test(data.slice(0, data.length - padding)))
      throw new InvalidInputError("Expected standard Base64 with canonical padding");
    if (padding === 2 && (BASE64.indexOf(data[data.length - 3]) & 15) !== 0 || padding === 1 && (BASE64.indexOf(data[data.length - 2]) & 3) !== 0)
      throw new InvalidInputError("Base64 has non-zero padding bits");
    const result = new Uint8Array(data.length / 4 * 3 - padding);
    let offset = 0;
    for (let i = 0;i < data.length; i += 4) {
      const a = BASE64.indexOf(data[i]);
      const b = BASE64.indexOf(data[i + 1]);
      const c = Math.max(0, BASE64.indexOf(data[i + 2]));
      const d = Math.max(0, BASE64.indexOf(data[i + 3]));
      result[offset++] = a << 2 | b >>> 4;
      if (offset < result.length)
        result[offset++] = b << 4 | c >>> 2;
      if (offset < result.length)
        result[offset++] = c << 6 | d;
    }
    return result;
  }
  function encodeUtf8(data) {
    if (typeof data !== "string")
      throw new InvalidInputError("Expected a string");
    if (typeof TextEncoder === "function")
      return new TextEncoder().encode(data);
    const result = [];
    for (const character of data) {
      let point = character.codePointAt(0);
      if (point >= 55296 && point <= 57343)
        point = 65533;
      if (point < 128)
        result.push(point);
      else if (point < 2048)
        result.push(192 | point >>> 6, 128 | point & 63);
      else if (point < 65536)
        result.push(224 | point >>> 12, 128 | point >>> 6 & 63, 128 | point & 63);
      else
        result.push(240 | point >>> 18, 128 | point >>> 12 & 63, 128 | point >>> 6 & 63, 128 | point & 63);
    }
    return Uint8Array.from(result);
  }
  function decodeUtf8(data) {
    const value = toBinary(data);
    if (typeof TextDecoder === "function")
      return new TextDecoder("utf-8", { ignoreBOM: true }).decode(value);
    let result = "";
    let i = 0;
    while (i < value.length) {
      const first = value[i++];
      if (first < 128) {
        result += String.fromCharCode(first);
        continue;
      }
      const count = first >= 194 && first <= 223 ? 1 : first >= 224 && first <= 239 ? 2 : first >= 240 && first <= 244 ? 3 : 0;
      if (!count) {
        result += "�";
        continue;
      }
      let point = first & 127 >>> count;
      let valid = true;
      for (let j = 0;j < count; j++) {
        const next = value[i];
        const lower = j === 0 && first === 224 ? 160 : j === 0 && first === 240 ? 144 : 128;
        const upper = j === 0 && first === 237 ? 159 : j === 0 && first === 244 ? 143 : 191;
        if (i === value.length || next < lower || next > upper) {
          valid = false;
          break;
        }
        point = point << 6 | next & 63;
        i++;
      }
      result += valid ? String.fromCodePoint(point) : "�";
    }
    return result;
  }
  function equalBinary(a, b) {
    const left = toBinary(a);
    const right = toBinary(b);
    if (left.length !== right.length)
      return false;
    const native = nativeEqual(left, right);
    if (native !== undefined)
      return native;
    let difference = 0;
    for (let i = 0;i < left.length; i++)
      difference |= left[i] ^ right[i];
    return difference === 0;
  }
  var bytes = {
    concat(...values) {
      const parts = values.map(toBinary);
      const length = parts.reduce((sum, part) => sum + part.length, 0);
      assertLength(length);
      const result = new Uint8Array(length);
      let offset = 0;
      for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
      }
      return result;
    },
    xor(a, b) {
      const left = toBinary(a);
      const right = toBinary(b);
      if (left.length !== right.length)
        throw new InvalidInputError("XOR inputs must have equal lengths");
      for (let i = 0;i < left.length; i++)
        left[i] ^= right[i];
      return left;
    },
    equal: equalBinary,
    slice(data, start, end) {
      if (start !== undefined && typeof start !== "number" || end !== undefined && typeof end !== "number")
        throw new InvalidInputError("Slice bounds must be numbers");
      return toBinary(data).slice(start, end);
    },
    hex: {
      encode: encodeHex,
      decode: decodeHex
    },
    base64: {
      encode: encodeBase64,
      decode: decodeBase64
    },
    utf8: {
      encode: encodeUtf8,
      decode: decodeUtf8
    }
  };
  function randomBytes(length) {
    assertLength(length, "Random byte length");
    const bytes2 = new Uint8Array(length);
    fillRandom(bytes2);
    return bytes2;
  }
  var random = /* @__PURE__ */ Object.assign(randomBytes, {
    hex(length) {
      return encodeHex(randomBytes(length));
    },
    base64(length) {
      return encodeBase64(randomBytes(length));
    },
    uint32() {
      return new DataView(randomBytes(4).buffer).getUint32(0);
    },
    uuid() {
      const value = randomBytes(16);
      value[6] = value[6] & 15 | 64;
      value[8] = value[8] & 63 | 128;
      const hex = encodeHex(value);
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  });
  var SLICE = 2 ** 21;
  var PBKDF2_SLICE = 2 ** 16;
  function yieldNow() {
    const scheduler = globalThis.scheduler;
    if (scheduler && typeof scheduler.yield === "function")
      return scheduler.yield();
    if (typeof setImmediate === "function")
      return new Promise((resolve) => setImmediate(resolve));
    if (typeof MessageChannel === "function")
      return new Promise((resolve) => {
        const channel = new MessageChannel;
        channel.port1.onmessage = () => {
          channel.port1.close();
          resolve();
        };
        channel.port2.postMessage(undefined);
      });
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
  async function forEachSlice(data, step, operation) {
    for (let offset = 0;offset < data.length; offset += step) {
      operation(data.subarray(offset, offset + step), offset);
      if (offset + step < data.length)
        await yieldNow();
    }
  }
  var SyncDigest = class {
    constructor(engine, name) {
      this.engine = engine;
      this.name = name;
      this.failed = false;
    }
    update(data) {
      if (!this.engine)
        throw new InvalidInputError(`${this.name} has already been finalized`);
      try {
        this.engine.update(toBytesView(data));
      } catch (error) {
        this.engine = undefined;
        this.failed = true;
        this.error = error;
        throw error;
      }
      return this;
    }
    digest() {
      if (this.failed)
        throw this.error;
      if (this.result)
        return Uint8Array.from(this.result);
      const engine = this.engine;
      this.engine = undefined;
      try {
        this.result = engine.digest();
      } catch (error) {
        this.failed = true;
        this.error = error;
        throw error;
      }
      return this.result.slice();
    }
  };
  var AsyncDigest = class {
    constructor(state) {
      this.state = state;
    }
    update(data) {
      this.state.update(data);
      return this;
    }
    async digest() {
      return this.state.digest();
    }
  };
  var State$1 = class extends AsyncDigest {
    async hex() {
      return encodeHex(await this.digest());
    }
    async base64() {
      return encodeBase64(await this.digest());
    }
  };
  function createSyncHash(name, createJS, createWasm) {
    const create = () => new SyncDigest(nativeHash(name) ?? createWasm?.() ?? createJS(), "Hash");
    const hash = (data) => {
      const bytes2 = toBytesView(data);
      const native = nativeDigestSync(name, bytes2);
      if (native !== undefined)
        return native;
      if (createWasm && nativeHash(name) === undefined) {
        const output = createWasm.once(bytes2);
        if (output)
          return output;
      }
      return create().update(bytes2).digest();
    };
    return Object.assign(hash, { create });
  }
  async function digestAsync(sync, input) {
    if (input.length <= SLICE)
      return sync(input);
    const state = sync.create();
    await forEachSlice(input, SLICE, (slice) => {
      state.update(slice);
    });
    return state.digest();
  }
  function createHash(name, sync) {
    const create = () => new State$1(sync.create());
    const hash = async (data) => {
      const input = toBytesView(data);
      if (!nativeDigestAvailable(name))
        return digestAsync(sync, input);
      const copy = typeof data === "string" ? input : Uint8Array.from(input);
      const native = await nativeDigest(name, copy);
      return native === undefined ? digestAsync(sync, copy) : native;
    };
    return Object.assign(hash, {
      hex: async (data) => encodeHex(await hash(data)),
      base64: async (data) => encodeBase64(await hash(data)),
      create,
      sync
    });
  }
  var BlockHash = class {
    constructor(blockSize, lengthSize, littleEndian = false) {
      this.blockSize = blockSize;
      this.lengthSize = lengthSize;
      this.littleEndian = littleEndian;
      this.position = 0;
      this.length = 0n;
      this.finalized = false;
      this.buffer = new Uint8Array(blockSize);
      this.view = new DataView(this.buffer.buffer);
    }
    update(data) {
      if (this.finalized)
        throw new InvalidInputError("Hash has already been finalized");
      const length = this.length + BigInt(data.length);
      if (!this.littleEndian && length >= 1n << BigInt(this.lengthSize * 8 - 3))
        throw new InvalidInputError("Message is too long for this hash");
      this.length = length;
      let offset = 0;
      if (this.position) {
        const count = Math.min(data.length, this.blockSize - this.position);
        this.buffer.set(data.subarray(0, count), this.position);
        this.position += count;
        offset = count;
        if (this.position === this.blockSize) {
          this.process(this.view, 0);
          this.position = 0;
        }
      }
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      while (offset + this.blockSize <= data.length) {
        this.process(view, offset);
        offset += this.blockSize;
      }
      if (offset < data.length) {
        this.buffer.set(data.subarray(offset), this.position);
        this.position += data.length - offset;
      }
    }
    digest() {
      if (this.finalized)
        throw new InvalidInputError("Hash has already been finalized");
      this.finalized = true;
      this.buffer[this.position++] = 128;
      this.buffer.fill(0, this.position);
      if (this.position > this.blockSize - this.lengthSize) {
        this.process(this.view, 0);
        this.buffer.fill(0);
      }
      let bits = this.length * 8n;
      for (let i = 0;i < this.lengthSize; i++) {
        const offset = this.littleEndian ? this.blockSize - this.lengthSize + i : this.blockSize - 1 - i;
        this.buffer[offset] = Number(bits & 255n);
        bits >>= 8n;
      }
      this.process(this.view, 0);
      const result = this.output();
      this.buffer.fill(0);
      this.clear();
      this.length = 0n;
      this.position = 0;
      return result;
    }
    output() {
      return wordsToBytes(this.state, this.littleEndian);
    }
    clear() {
      this.state.fill(0);
      this.words.fill(0);
    }
  };
  function wordsToBytes(words2, littleEndian = false) {
    const result = new Uint8Array(words2.length * 4);
    const view = new DataView(result.buffer);
    for (let i = 0;i < words2.length; i++)
      view.setUint32(i * 4, words2[i], littleEndian);
    return result;
  }
  var K$2 = /* @__PURE__ */ new Uint32Array([
    3614090360,
    3905402710,
    606105819,
    3250441966,
    4118548399,
    1200080426,
    2821735955,
    4249261313,
    1770035416,
    2336552879,
    4294925233,
    2304563134,
    1804603682,
    4254626195,
    2792965006,
    1236535329,
    4129170786,
    3225465664,
    643717713,
    3921069994,
    3593408605,
    38016083,
    3634488961,
    3889429448,
    568446438,
    3275163606,
    4107603335,
    1163531501,
    2850285829,
    4243563512,
    1735328473,
    2368359562,
    4294588738,
    2272392833,
    1839030562,
    4259657740,
    2763975236,
    1272893353,
    4139469664,
    3200236656,
    681279174,
    3936430074,
    3572445317,
    76029189,
    3654602809,
    3873151461,
    530742520,
    3299628645,
    4096336452,
    1126891415,
    2878612391,
    4237533241,
    1700485571,
    2399980690,
    4293915773,
    2240044497,
    1873313359,
    4264355552,
    2734768916,
    1309151649,
    4149444226,
    3174756917,
    718787259,
    3951481745
  ]);
  var SHIFT = [
    7,
    12,
    17,
    22,
    5,
    9,
    14,
    20,
    4,
    11,
    16,
    23,
    6,
    10,
    15,
    21
  ];
  var Md5 = class extends BlockHash {
    constructor() {
      super(64, 8, true);
      this.state = new Uint32Array([
        1732584193,
        4023233417,
        2562383102,
        271733878
      ]);
      this.words = /* @__PURE__ */ new Uint32Array(16);
    }
    process(view, offset) {
      const w = this.words;
      for (let i = 0;i < 16; i++)
        w[i] = view.getUint32(offset + i * 4, true);
      let [a, b, c, d] = this.state;
      for (let i = 0;i < 64; i++) {
        let f;
        let g;
        if (i < 16) {
          f = b & c | ~b & d;
          g = i;
        } else if (i < 32) {
          f = d & b | ~d & c;
          g = 5 * i + 1 & 15;
        } else if (i < 48) {
          f = b ^ c ^ d;
          g = 3 * i + 5 & 15;
        } else {
          f = c ^ (b | ~d);
          g = 7 * i & 15;
        }
        const shift = SHIFT[(i >>> 4) * 4 + (i & 3)];
        const sum = a + f + K$2[i] + w[g] | 0;
        a = d;
        d = c;
        c = b;
        b = b + (sum << shift | sum >>> 32 - shift) | 0;
      }
      this.state[0] += a;
      this.state[1] += b;
      this.state[2] += c;
      this.state[3] += d;
    }
  };
  var md5 = /* @__PURE__ */ createHash("md5", /* @__PURE__ */ createSyncHash("md5", () => new Md5));
  var Sha1 = class extends BlockHash {
    constructor() {
      super(64, 8);
      this.state = new Uint32Array([
        1732584193,
        4023233417,
        2562383102,
        271733878,
        3285377520
      ]);
      this.words = /* @__PURE__ */ new Uint32Array(80);
    }
    process(view, offset) {
      const w = this.words;
      for (let i = 0;i < 16; i++)
        w[i] = view.getUint32(offset + i * 4);
      for (let i = 16;i < 80; i++) {
        const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
        w[i] = x << 1 | x >>> 31;
      }
      let [a, b, c, d, e] = this.state;
      for (let i = 0;i < 80; i++) {
        let f;
        let k;
        if (i < 20) {
          f = b & c | ~b & d;
          k = 1518500249;
        } else if (i < 40) {
          f = b ^ c ^ d;
          k = 1859775393;
        } else if (i < 60) {
          f = b & c | b & d | c & d;
          k = 2400959708;
        } else {
          f = b ^ c ^ d;
          k = 3395469782;
        }
        const temp = (a << 5 | a >>> 27) + f + e + k + w[i] | 0;
        e = d;
        d = c;
        c = b << 30 | b >>> 2;
        b = a;
        a = temp;
      }
      this.state[0] += a;
      this.state[1] += b;
      this.state[2] += c;
      this.state[3] += d;
      this.state[4] += e;
    }
  };
  var sha1Sync = /* @__PURE__ */ createSyncHash("sha1", () => new Sha1);
  var sha1 = /* @__PURE__ */ createHash("sha1", sha1Sync);
  function wasm(...sources) {
    return lazy(() => {
      if (typeof WebAssembly === "undefined")
        return;
      for (const source of sources)
        try {
          const module3 = new WebAssembly.Module(decodeBase64(source));
          return new WebAssembly.Instance(module3).exports;
        } catch (error) {
          if (!(error instanceof WebAssembly.CompileError))
            throw error;
        }
    });
  }
  function check$2(status, name) {
    if (status === 1)
      throw new InvalidInputError("Message is too long for this hash");
    if (status !== 0)
      throw new CifranteError(`WASM ${name} operation failed`);
  }
  var WasmHash = class {
    constructor(context) {
      this.context = context;
      const { engine, stateView } = context;
      engine.init();
      this.state = stateView.slice();
      stateView.fill(0);
    }
    use(operation, inputLength = 0) {
      const { memory, stateView, outputView, stateOffset, inputOffset } = this.context;
      memory.set(this.state, stateOffset);
      try {
        return operation();
      } catch (error) {
        this.state.fill(0);
        throw error;
      } finally {
        stateView.fill(0);
        memory.fill(0, inputOffset, inputOffset + inputLength);
        outputView.fill(0);
      }
    }
    update(data) {
      const { engine, name, memory, stateView, inputOffset, inputCapacity } = this.context;
      this.use(() => {
        for (let offset = 0;offset < data.length; offset += inputCapacity) {
          const chunk = data.subarray(offset, offset + inputCapacity);
          memory.set(chunk, inputOffset);
          check$2(engine.update(chunk.length), name);
        }
        this.state.set(stateView);
      }, Math.min(data.length, inputCapacity));
    }
    digest() {
      try {
        return this.use(() => {
          const { engine, name, outputView } = this.context;
          check$2(engine.finalize(), name);
          return outputView.slice();
        });
      } finally {
        this.state.fill(0);
      }
    }
  };
  function wasmHash(source, name, outputLength) {
    const load2 = wasm(source);
    const prepare2 = lazy(() => {
      const engine = load2();
      if (!engine)
        return;
      const memory = new Uint8Array(engine.memory.buffer);
      const stateOffset = engine.state_ptr();
      const stateSize = engine.state_size();
      const outputOffset = engine.output_ptr();
      return {
        engine,
        name,
        outputLength,
        memory,
        stateView: memory.subarray(stateOffset, stateOffset + stateSize),
        outputView: memory.subarray(outputOffset, outputOffset + outputLength),
        stateOffset,
        stateSize,
        inputOffset: engine.input_ptr(),
        inputCapacity: engine.input_capacity(),
        outputOffset
      };
    });
    const once = (data) => {
      const context = prepare2();
      if (!context)
        return;
      const { engine, memory, stateView, outputView, inputOffset, inputCapacity } = context;
      engine.init();
      try {
        for (let offset = 0;offset < data.length; offset += inputCapacity) {
          const chunk = data.subarray(offset, offset + inputCapacity);
          memory.set(chunk, inputOffset);
          check$2(engine.update(chunk.length), name);
        }
        check$2(engine.finalize(), name);
        return outputView.slice();
      } finally {
        stateView.fill(0);
        memory.fill(0, inputOffset, inputOffset + Math.min(data.length, inputCapacity));
        outputView.fill(0);
      }
    };
    return Object.assign(() => {
      const context = prepare2();
      return context ? new WasmHash(context) : undefined;
    }, { once });
  }
  var createSha256Wasm = /* @__PURE__ */ wasmHash("AGFzbQEAAAABEQRgAX8AYAABf2AAAGABfwF/AwoJAAECAQEBAQEDBAUBcAEBAQUEAQECAgYIAX8BQYCAAQsHaAkGbWVtb3J5AgAJc3RhdGVfcHRyAAYKc3RhdGVfc2l6ZQAHCWlucHV0X3B0cgAEDmlucHV0X2NhcGFjaXR5AAMKb3V0cHV0X3B0cgAFBGluaXQAAgZ1cGRhdGUACAhmaW5hbGl6ZQABCvodCf4SASx/IAAoAjwhASAAKAI4IQIgACgCNCEDIAAoAjAhBCAAKAIsIQUgACgCKCEGIAAoAiQhByAAKAIgIQggACgCHCEJIAAoAhghCiAAKAIUIQsgACgCECEMIAAoAgwhDSAAKAIIIQ4gACgCBCEPIAAoAgAhEEHAfiEAQQAoAryCASIRIRJBACgCuIIBIhMhFEEAKAK0ggEiFSEWQQAoArCCASIXIRhBACgCrIIBIhkhGkEAKAKoggEiGyEcQQAoAqSCASIdIR5BACgCoIIBIh8hIANAICBBHncgIEETd3MgIEEKd3MgICAeciAccSAgIB5xcmogGCAWIBRzcSAUcyASaiAYQRp3IBhBFXdzIBhBB3dzaiAQaiAAQeCBAWooAgBqIiFqIiJBHncgIkETd3MgIkEKd3MgIiAgciAecSAiICBxcmogDyAUaiAAQeSBAWooAgBqICEgGmoiISAYIBZzcSAWc2ogIUEadyAhQRV3cyAhQQd3c2oiEmoiGkEedyAaQRN3cyAaQQp3cyAaICJyICBxIBogInFyaiAOIBZqIABB6IEBaigCAGogEiAcaiISICEgGHNxIBhzaiASQRp3IBJBFXdzIBJBB3dzaiIUaiIcQR53IBxBE3dzIBxBCndzIBwgGnIgInEgHCAacXJqIA0gGGogAEHsgQFqKAIAaiAUIB5qIhQgEiAhc3EgIXNqIBRBGncgFEEVd3MgFEEHd3NqIh5qIhhBHncgGEETd3MgGEEKd3MgGCAcciAacSAYIBxxcmogISAMaiAAQfCBAWooAgBqIB4gIGoiISAUIBJzcSASc2ogIUEadyAhQRV3cyAhQQd3c2oiHmoiIEEedyAgQRN3cyAgQQp3cyAgIBhyIBxxICAgGHFyaiAAQfSBAWooAgAgC2ogEmogHiAiaiIiICEgFHNxIBRzaiAiQRp3ICJBFXdzICJBB3dzaiISaiIeQR53IB5BE3dzIB5BCndzIB4gIHIgGHEgHiAgcXJqIABB+IEBaigCACAKaiAUaiASIBpqIhIgIiAhc3EgIXNqIBJBGncgEkEVd3MgEkEHd3NqIhRqIhpBHncgGkETd3MgGkEKd3MgGiAeciAgcSAaIB5xcmogAEH8gQFqKAIAIAlqICFqIBQgHGoiISASICJzcSAic2ogIUEadyAhQRV3cyAhQQd3c2oiFGoiHEEedyAcQRN3cyAcQQp3cyAcIBpyIB5xIBwgGnFyaiAAQYCCAWooAgAgCGogImogFCAYaiIUICEgEnNxIBJzaiAUQRp3IBRBFXdzIBRBB3dzaiIiaiIYQR53IBhBE3dzIBhBCndzIBggHHIgGnEgGCAccXJqIABBhIIBaigCACAHaiASaiAiICBqIhIgFCAhc3EgIXNqIBJBGncgEkEVd3MgEkEHd3NqIiJqIiBBHncgIEETd3MgIEEKd3MgICAYciAccSAgIBhxcmogAEGIggFqKAIAIAZqICFqICIgHmoiHiASIBRzcSAUc2ogHkEadyAeQRV3cyAeQQd3c2oiIWoiIkEedyAiQRN3cyAiQQp3cyAiICByIBhxICIgIHFyaiAAQYyCAWooAgAgBWogFGogISAaaiIUIB4gEnNxIBJzaiAUQRp3IBRBFXdzIBRBB3dzaiIaaiIhQR53ICFBE3dzICFBCndzICEgInIgIHEgISAicXJqIABBkIIBaigCACAEaiASaiAaIBxqIhYgFCAec3EgHnNqIBZBGncgFkEVd3MgFkEHd3NqIhxqIhpBHncgGkETd3MgGkEKd3MgGiAhciAicSAaICFxcmogAEGUggFqKAIAIANqIB5qIBwgGGoiEiAWIBRzcSAUc2ogEkEadyASQRV3cyASQQd3c2oiGGoiHEEedyAcQRN3cyAcQQp3cyAcIBpyICFxIBwgGnFyaiAAQZiCAWooAgAgAmogFGogGCAgaiIUIBIgFnNxIBZzaiAUQRp3IBRBFXdzIBRBB3dzaiIgaiIeQR53IB5BE3dzIB5BCndzIB4gHHIgGnEgHiAccXJqIABBnIIBaigCACABaiAWaiAgICJqIhYgFCASc3EgEnNqIBZBGncgFkEVd3MgFkEHd3NqIhhqISAgGCAhaiEYAkAgAA0AQQAgEiARajYCvIIBQQAgFCATajYCuIIBQQAgFiAVajYCtIIBQQAgGCAXajYCsIIBQQAgGiAZajYCrIIBQQAgHCAbajYCqIIBQQAgHiAdajYCpIIBQQAgICAfajYCoIIBDwsgBkEOdyEjIAZBGXchJCAGQQN2ISUgBEEOdyEmIARBGXchJyAEQQN2ISggAkEOdyEpIAJBGXchKiACQQN2ISsgAUEZdyABQQ53cyABQQN2cyACaiAIQRl3IAhBDndzIAhBA3ZzIAlqIAcgAkEPdyACQQ13cyACQQp2c2ogEGogD0EZdyAPQQ53cyAPQQN2c2oiEGogCyACaiAKQRl3IApBDndzIApBA3ZzaiANIARqIAxBGXcgDEEOd3MgDEEDdnNqIAYgAUEPdyABQQ13cyABQQp2c2ogD2ogDkEZdyAOQQ53cyAOQQN2c2oiIkEPdyAiQQ13cyAiQQp2c2oiIUEPdyAhQQ13cyAhQQp2c2oiD0EPdyAPQQ13cyAPQQp2c2oiLGogA0EZdyADQQ53cyADQQN2cyAEaiAPaiAFQRl3IAVBDndzIAVBA3ZzIAZqICFqIAdBGXcgB0EOd3MgB0EDdnMgCGogImogCiABaiAJQRl3IAlBDndzIAlBA3ZzaiAMIANqIAtBGXcgC0EOd3MgC0EDdnNqIA4gBWogDUEZdyANQQ53cyANQQN2c2ogEEEPdyAQQQ13cyAQQQp2c2oiDkEPdyAOQQ13cyAOQQp2c2oiDEEPdyAMQQ13cyAMQQp2c2oiCkEPdyAKQQ13cyAKQQp2c2oiCEEPdyAIQQ13cyAIQQp2c2oiBkEPdyAGQQ13cyAGQQp2c2oiBEEPdyAEQQ13cyAEQQp2c2ohAiAAQcAAaiEAIBBBGXcgEEEOd3MgEEEDdnMgAWogCGogKyAqIClzcyADaiAKaiAoICcgJnNzIAVqIAxqICUgJCAjc3MgB2ogDmogLEEPdyAsQQ13cyAsQQp2c2oiB0EPdyAHQQ13cyAHQQp2c2oiBUEPdyAFQQ13cyAFQQp2c2oiA0EPdyADQQ13cyADQQp2c2ohASADIQMgBSEFIAchByAsIQkgDyELICEhDSAiIQ8MAAsLzAQCA38BfiMAQcAAayIAJABBAiEBAkBBACgCjIMBDQBBACgCiIMBIgJBP0sNAEEBIQFBACkDwIIBIgNC//////////8fVg0AIAJBgAE6AMiCAQJAAkAgAkE/Rg0AIAIhAQNAIAFByYIBakEAOgAAIAFBAWoiAUE/Rw0ACyACQTdNDQELQQAhAQNAIAAgAWogAUHIggFqKAIAIgJB/4H8B3FBCHggAkEYeEH/gfwHcXI2AgAgAUEEaiIBQcAARw0ACyAAEABBACEBA0AgACABakIANwMAIAFBCGoiAUE/TQ0AC0EoIQEDQCABQaCCAWpCADcDACABQWBqIQIgAUEIaiEBIAJBwABJDQALQQApA8CCASEDC0EAIQFBACADQjuGIANCK4ZCgICAgICAwP8Ag4QgA0IbhkKAgICAgOA/gyADQguGQoCAgIDwH4OEhCADQgWIQoCAgPgPgyADQhWIQoCA/AeDhCADQiWIQoD+A4MgA0IDhkI4iISEhDcDgIMBA0AgACABaiABQciCAWooAgAiAkH/gfwHcUEIeCACQRh4Qf+B/AdxcjYCACABQQRqIgFBwABHDQALIAAQAEEAIQEDQCAAIAFqQgA3AwAgAUEIaiIBQT9NDQALQWAhAQNAIAFBsIMFaiABQcCCAWooAgAiAkH/gfwHcUEIeCACQRh4Qf+B/AdxcjYCACABQQRqIgENAAtBACEBA0AgAUGgggFqQgA3AwAgAUEIaiIBQfAASQ0AC0EAIQFBAEEBNgKMgwELIABBwABqJAAgAQtnAQF/QQAhAANAIABBoIIBakIANwMAIABBCGoiAEHwAEkNAAtBYCEAA0AgAEHAggFqIABBoIABaigCADYCACAAQQRqIgANAAtBeCEAA0AgAEGYgwVqQgA3AwAgAEEIaiIAQRFJDQALCwYAQYCABAsGAEGQgwELBgBBkIMFCwYAQaCCAQsFAEHwAAufBQMDfwJ+A38jAEHAAGsiASQAQQIhAgJAIABBgIAESw0AQQAoAoyDAQ0AQQAoAoiDASIDQT9LDQBBASECQQApA8CCASIEQv//////////H1YNAEL//////////x8gBH0gAK0iBVQNAEEAIQZBACAEIAV8NwPAggECQCADRQ0AQQAhAgJAQcAAIANrIgcgACAHIABJGyIGQQhJDQAgA0HIggFqIQhBACECA0AgCCACIgdqIAdBkIMBaikDADcAACAHQQhqIQIgB0EQaiAGTQ0ACwsCQCACIAZPDQAgA0HIggFqIQcDQCAHIAJqIAJBkIMBai0AADoAACAGIAJBAWoiAkcNAAsLQQAhAkEAQQAoAoiDASAGaiIHNgKIgwEgB0HAAEcNAANAIAEgAmogAkHIggFqKAIAIgdB/4H8B3FBCHggB0EYeEH/gfwHcXI2AgAgAkEEaiICQcAARw0ACyABEABBACECA0AgASACakIANwMAIAJBCGoiAkE/TQ0AC0EAQQA2AoiDAQsCQCAAIAZrIgdBwABJDQADQEEAIQIDQCABIAJqIAYgAmpBkIMBaigAACIHQf+B/AdxQQh4IAdBGHhB/4H8B3FyNgIAIAJBBGoiAkHAAEcNAAsgARAAQQAhAgNAIAEgAmpCADcDACACQQhqIgJBP00NAAsgACAGQcAAaiIGayIHQT9LDQALC0EAIQIgBiAATw0AIAZBkIMBaiEAQQAhAgJAIAdBCEkNAEEAIQIDQCACIgZByIIBaiAAIAZqKQAANwMAIAZBCGohAiAGQRBqIAdNDQALCwJAIAIgB08NAANAIAJByIIBaiAAIAJqLQAAOgAAIAcgAkEBaiICRw0ACwtBACECQQAgBzYCiIMBCyABQcAAaiQAIAILC6kCAQBBgIABC6ACZ+YJaoWuZ7ty8248OvVPpX9SDlGMaAWbq9mDHxnN4FuYL4pCkUQ3cc/7wLWl27XpW8JWOfER8Vmkgj+S1V4cq5iqB9gBW4MSvoUxJMN9DFV0Xb5y/rHegKcG3Jt08ZvBwWmb5IZHvu/GncEPzKEMJG8s6S2qhHRK3KmwXNqI+XZSUT6YbcYxqMgnA7DHf1m/8wvgxkeRp9VRY8oGZykpFIUKtyc4IRsu/G0sTRMNOFNUcwpluwpqdi7JwoGFLHKSoei/oktmGqhwi0vCo1FsxxnoktEkBpnWhTUO9HCgahAWwaQZCGw3Hkx3SCe1vLA0swwcOUqq2E5Pypxb828uaO6Cj3RvY6V4FHjIhAgCx4z6/76Q62xQpPej+b7yeHHG", "SHA-256", 32);
  var K$1 = /* @__PURE__ */ new Uint32Array([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  function rotr(value, bits) {
    return value >>> bits | value << 32 - bits;
  }
  var Sha256 = class extends BlockHash {
    constructor() {
      super(64, 8);
      this.state = new Uint32Array([
        1779033703,
        3144134277,
        1013904242,
        2773480762,
        1359893119,
        2600822924,
        528734635,
        1541459225
      ]);
      this.words = /* @__PURE__ */ new Uint32Array(64);
    }
    process(view, offset) {
      const w = this.words;
      for (let i = 0;i < 16; i++)
        w[i] = view.getUint32(offset + i * 4);
      for (let i = 16;i < 64; i++) {
        const x = w[i - 15];
        const y = w[i - 2];
        const s0 = rotr(x, 7) ^ rotr(x, 18) ^ x >>> 3;
        const s1 = rotr(y, 17) ^ rotr(y, 19) ^ y >>> 10;
        w[i] = w[i - 16] + s0 + w[i - 7] + s1;
      }
      let [a, b, c, d, e, f, g, h] = this.state;
      for (let i = 0;i < 64; i++) {
        const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const choice = e & f ^ ~e & g;
        const t1 = h + s1 + choice + K$1[i] + w[i] | 0;
        const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) | 0;
        h = g;
        g = f;
        f = e;
        e = d + t1 | 0;
        d = c;
        c = b;
        b = a;
        a = t1 + t2 | 0;
      }
      this.state[0] += a;
      this.state[1] += b;
      this.state[2] += c;
      this.state[3] += d;
      this.state[4] += e;
      this.state[5] += f;
      this.state[6] += g;
      this.state[7] += h;
    }
  };
  var sha256Sync = /* @__PURE__ */ createSyncHash("sha256", () => new Sha256, createSha256Wasm);
  var sha256 = /* @__PURE__ */ createHash("sha256", sha256Sync);
  var createSha512Wasm = /* @__PURE__ */ wasmHash("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", "SHA-512", 64);
  var K = /* @__PURE__ */ new Uint32Array([
    1116352408,
    3609767458,
    1899447441,
    602891725,
    3049323471,
    3964484399,
    3921009573,
    2173295548,
    961987163,
    4081628472,
    1508970993,
    3053834265,
    2453635748,
    2937671579,
    2870763221,
    3664609560,
    3624381080,
    2734883394,
    310598401,
    1164996542,
    607225278,
    1323610764,
    1426881987,
    3590304994,
    1925078388,
    4068182383,
    2162078206,
    991336113,
    2614888103,
    633803317,
    3248222580,
    3479774868,
    3835390401,
    2666613458,
    4022224774,
    944711139,
    264347078,
    2341262773,
    604807628,
    2007800933,
    770255983,
    1495990901,
    1249150122,
    1856431235,
    1555081692,
    3175218132,
    1996064986,
    2198950837,
    2554220882,
    3999719339,
    2821834349,
    766784016,
    2952996808,
    2566594879,
    3210313671,
    3203337956,
    3336571891,
    1034457026,
    3584528711,
    2466948901,
    113926993,
    3758326383,
    338241895,
    168717936,
    666307205,
    1188179964,
    773529912,
    1546045734,
    1294757372,
    1522805485,
    1396182291,
    2643833823,
    1695183700,
    2343527390,
    1986661051,
    1014477480,
    2177026350,
    1206759142,
    2456956037,
    344077627,
    2730485921,
    1290863460,
    2820302411,
    3158454273,
    3259730800,
    3505952657,
    3345764771,
    106217008,
    3516065817,
    3606008344,
    3600352804,
    1432725776,
    4094571909,
    1467031594,
    275423344,
    851169720,
    430227734,
    3100823752,
    506948616,
    1363258195,
    659060556,
    3750685593,
    883997877,
    3785050280,
    958139571,
    3318307427,
    1322822218,
    3812723403,
    1537002063,
    2003034995,
    1747873779,
    3602036899,
    1955562222,
    1575990012,
    2024104815,
    1125592928,
    2227730452,
    2716904306,
    2361852424,
    442776044,
    2428436474,
    593698344,
    2756734187,
    3733110249,
    3204031479,
    2999351573,
    3329325298,
    3815920427,
    3391569614,
    3928383900,
    3515267271,
    566280711,
    3940187606,
    3454069534,
    4118630271,
    4000239992,
    116418474,
    1914138554,
    174292421,
    2731055270,
    289380356,
    3203993006,
    460393269,
    320620315,
    685471733,
    587496836,
    852142971,
    1086792851,
    1017036298,
    365543100,
    1126000580,
    2618297676,
    1288033470,
    3409855158,
    1501505948,
    4234509866,
    1607167915,
    987167468,
    1816402316,
    1246189591
  ]);
  var WORD = 4294967296;
  var Sha512 = class extends BlockHash {
    constructor() {
      super(128, 16);
      this.state = new Uint32Array([
        1779033703,
        4089235720,
        3144134277,
        2227873595,
        1013904242,
        4271175723,
        2773480762,
        1595750129,
        1359893119,
        2917565137,
        2600822924,
        725511199,
        528734635,
        4215389547,
        1541459225,
        327033209
      ]);
      this.words = /* @__PURE__ */ new Uint32Array(160);
    }
    process(view, offset) {
      const w = this.words;
      for (let i = 0;i < 32; i++)
        w[i] = view.getUint32(offset + i * 4);
      for (let i = 32;i < 160; i += 2) {
        const xh = w[i - 30];
        const xl = w[i - 29];
        const yh = w[i - 4];
        const yl = w[i - 3];
        const s0h = (xh >>> 1 | xl << 31) ^ (xh >>> 8 | xl << 24) ^ xh >>> 7;
        const s0l = (xl >>> 1 | xh << 31) ^ (xl >>> 8 | xh << 24) ^ (xl >>> 7 | xh << 25);
        const s1h = (yh >>> 19 | yl << 13) ^ (yl >>> 29 | yh << 3) ^ yh >>> 6;
        const s1l = (yl >>> 19 | yh << 13) ^ (yh >>> 29 | yl << 3) ^ (yl >>> 6 | yh << 26);
        const low = w[i - 31] + (s0l >>> 0) + w[i - 13] + (s1l >>> 0);
        w[i] = w[i - 32] + (s0h >>> 0) + w[i - 14] + (s1h >>> 0) + Math.floor(low / WORD);
        w[i + 1] = low;
      }
      let [ah, al, bh, bl, ch, cl, dh, dl, eh, el, fh, fl, gh, gl, hh, hl] = this.state;
      for (let i = 0;i < 160; i += 2) {
        const s1h = (eh >>> 14 | el << 18) ^ (eh >>> 18 | el << 14) ^ (el >>> 9 | eh << 23);
        const s1l = (el >>> 14 | eh << 18) ^ (el >>> 18 | eh << 14) ^ (eh >>> 9 | el << 23);
        const choiceH = eh & fh ^ ~eh & gh;
        const choiceL = el & fl ^ ~el & gl;
        const sum1 = hl + (s1l >>> 0) + (choiceL >>> 0) + K[i + 1] + w[i + 1];
        const t1h = hh + (s1h >>> 0) + (choiceH >>> 0) + K[i] + w[i] + Math.floor(sum1 / WORD) >>> 0;
        const t1l = sum1 >>> 0;
        const s0h = (ah >>> 28 | al << 4) ^ (al >>> 2 | ah << 30) ^ (al >>> 7 | ah << 25);
        const s0l = (al >>> 28 | ah << 4) ^ (ah >>> 2 | al << 30) ^ (ah >>> 7 | al << 25);
        const majorityH = ah & bh ^ ah & ch ^ bh & ch;
        const majorityL = al & bl ^ al & cl ^ bl & cl;
        const sum2 = (s0l >>> 0) + (majorityL >>> 0);
        const t2h = (s0h >>> 0) + (majorityH >>> 0) + Math.floor(sum2 / WORD) >>> 0;
        const t2l = sum2 >>> 0;
        hh = gh;
        hl = gl;
        gh = fh;
        gl = fl;
        fh = eh;
        fl = el;
        const sumE = dl + t1l;
        eh = dh + t1h + Math.floor(sumE / WORD) >>> 0;
        el = sumE >>> 0;
        dh = ch;
        dl = cl;
        ch = bh;
        cl = bl;
        bh = ah;
        bl = al;
        const sumA = t1l + t2l;
        ah = t1h + t2h + Math.floor(sumA / WORD) >>> 0;
        al = sumA >>> 0;
      }
      const result = [
        ah,
        al,
        bh,
        bl,
        ch,
        cl,
        dh,
        dl,
        eh,
        el,
        fh,
        fl,
        gh,
        gl,
        hh,
        hl
      ];
      for (let i = 0;i < 16; i += 2) {
        const low = this.state[i + 1] + result[i + 1];
        this.state[i] += result[i] + Math.floor(low / WORD);
        this.state[i + 1] = low;
      }
    }
  };
  var sha512Sync = /* @__PURE__ */ createSyncHash("sha512", () => new Sha512, createSha512Wasm);
  var sha512 = /* @__PURE__ */ createHash("sha512", sha512Sync);
  var load$1 = /* @__PURE__ */ wasm("AGFzbQEAAAABIAZgAXsBe2ABfwF/YAABf2AFf39/f38AYAF/AGACfn4AAx4dAAABAgICAgICAgIDAQEBAQEBBAEFAQEBAQICAgEEBQFwAQEBBQQBAQICBggBfwFBgIABCwfGAhkGbWVtb3J5AgAJc3RhdGVfcHRyAAgKc3RhdGVfc2l6ZQAJEXN0YXRlX2NpcGhlcl9zaXplAAcHa2V5X3B0cgAGBml2X3B0cgAFB3RhZ19wdHIACglpbnB1dF9wdHIABA5pbnB1dF9jYXBhY2l0eQADBGluaXQAAgtpZ2VfZW5jcnlwdAANC2lnZV9kZWNyeXB0AAwLY2JjX2VuY3J5cHQADwtjYmNfZGVjcnlwdAAODWN0cl90cmFuc2Zvcm0AEAtnY21fcHJlcGFyZQAaCWdjbV9iZWdpbgAVCWdjbV9ub25jZQAYDWdjbV9ub25jZV9lbmQAGQdnY21fYWFkABELZ2NtX2VuY3J5cHQAFxBnY21fYXV0aGVudGljYXRlABMHZ2NtX3RhZwAbCmdjbV92ZXJpZnkAHAtnY21fZGVjcnlwdAAWCryzAR2GEgMCewN/Cnv9DADDXZ5DgB7dXp0DwB3eQINBAP0ABNCAASAA/VEiAEEE/W39gAL9DAAQAhJkdGZ2xNTG1qCworIgAP0MDw8PDw8PDw8PDw8PDw8PDyIB/U79gAL9USECQQEhAwJAQQAoAsCAASIEQQVJDQBBkIEBIQNBBCEFA0AgA/0ABAD9DADlCxu/ShD1/kFaUa+0pO4iBv0MgAEJDg0LBwYPAgwFCgQDCCIAIAAgA0Fwav0ABAAgBiAAIAAgA0Fgav0ABAAgBiAAIAAgA0FQav0ABAD9DADuyzXXx/4Q2ww58ikc4iUiByAAIAAgAkEE/W0iCCACIAH9TiIJ/VEiCv2AAv0MgA8OBQcDCwQKDQgGDAkCASICIAn9gAIiC/1R/YACIAj9USIM/YAC/QwAo8D4+mE4m1uhWZnCOgJjIgkgACAAIAj9gAIgC/1R/YACIAr9USIL/YAC/VEiCCAI/Q0FBgcECQoLCA0ODwwBAgMAIAYgDP2AAv0MANmJOc6nsGngLheefkf3UCIIIAv9gAL9Uf1R/QwAC8AuaI3u5SVNY6OGqEbLIgogDP2AAv0MAHpJwTTGiPK7j04HvH31MyIMIAv9gAL9USILIAv9DQoLCAkODwwNAgMAAQYHBAUgCyAL/Q0PDA0OAwABAgcEBQYLCAkK/VH9Uf1RIg1BBP1tIgsgDSAB/U4iDf1RIg79gAIgAiAN/YACIg/9Uf2AAiAL/VEiDf2AAiAIIAAgACAL/YACIA/9Uf2AAiAO/VEiC/2AAv1R/VEgByAN/YACIAkgC/2AAv1RIg4gDv0NCQoLCA0ODwwBAgMABQYHBP1RIAogDf2AAiAMIAv9gAL9USILIAv9DQIDAAEGBwQFCgsICQ4PDA0gCyAL/Q0LCAkKDwwNDgMAAQIHBAUG/VH9USINQQT9bSILIA0gAf1OIg39USIO/YACIAIgDf2AAiIP/VH9gAIgC/1RIg39gAIgCCAAIAAgC/2AAiAP/VH9gAIgDv1RIgb9gAL9Uf1RIAcgDf2AAiAJIAb9gAL9USILIAv9DQ0ODwwBAgMABQYHBAkKCwj9USAKIA39gAIgDCAG/YAC/VEiBiAG/Q0KCwgJDg8MDQIDAAEGBwQFIAYgBv0NBwQFBgsICQoPDA0OAwABAv1R/VEiC0EE/W0iBiALIAH9TiIL/VEiDf2AAiACIAv9gAIiC/1R/YACIAb9USIC/YACIAggACAAIAb9gAIgC/1R/YACIA39USIA/YAC/VH9USAHIAL9gAIgCSAA/YAC/VEiBiAG/Q0BAgMABQYHBAkKCwgNDg8M/VEgCiAC/YACIAwgAP2AAv1RIgAgAP0NAgMAAQYHBAUKCwgJDg8MDSAAIAD9DQMAAQIHBAUGCwgJCg8MDQ79Uf1RIQIgA0HAAGohAyAFQQRqIgUgBEkNAAsgBEF7akF8cUEFaiEDCwJAIAMgBE8NACADQQR0/QAE0IAB/QwA7ss118f+ENsMOfIpHOIl/QyAAQkODQsHBg8CDAUKBAMIIgAgACACQQT9bSIGIAIgAf1OIgf9USIC/YAC/QyADw4FBwMLBAoNCAYMCQIBIAf9gAIiCf1R/YACIAb9USIH/YAC/QwAo8D4+mE4m1uhWZnCOgJjIAAgACAG/YACIAn9Uf2AAiAC/VEiAP2AAv1RIgYgBv0NBQYHBAkKCwgNDg8MAQIDAP0MAOULG79KEPX+QVpRr7Sk7iAH/YAC/QwA2Yk5zqewaeAuF55+R/dQIAD9gAL9Uf1R/QwAC8AuaI3u5SVNY6OGqEbLIAf9gAL9DAB6ScE0xojyu49OB7x99TMgAP2AAv1RIgAgAP0NCgsICQ4PDA0CAwABBgcEBSAAIAD9DQ8MDQ4DAAECBwQFBgsICQr9Uf1R/VEhAiADQQFqIQMLAkAgAyAETw0AIANBBHT9AATQgAH9DADuyzXXx/4Q2ww58ikc4iX9DIABCQ4NCwcGDwIMBQoEAwgiACAAIAJBBP1tIgYgAiAB/U4iB/1RIgL9gAL9DIAPDgUHAwsECg0IBgwJAgEgB/2AAiIJ/VH9gAIgBv1RIgf9gAL9DACjwPj6YTibW6FZmcI6AmMgACAAIAb9gAIgCf1R/YACIAL9USIA/YAC/VEiBiAG/Q0JCgsIDQ4PDAECAwAFBgcE/QwA5Qsbv0oQ9f5BWlGvtKTuIAf9gAL9DADZiTnOp7Bp4C4Xnn5H91AgAP2AAv1R/VH9DAALwC5oje7lJU1jo4aoRssgB/2AAv0MAHpJwTTGiPK7j04HvH31MyAA/YAC/VEiACAA/Q0CAwABBgcEBQoLCAkODwwNIAAgAP0NCwgJCg8MDQ4DAAECBwQFBv1R/VH9USECIANBAWohAwsCQCADIARPDQAgA0EEdP0ABNCAAf0MAO7LNdfH/hDbDDnyKRziJf0MgAEJDg0LBwYPAgwFCgQDCCIAIAAgAkEE/W0iBiACIAH9TiIH/VEiAv2AAv0MgA8OBQcDCwQKDQgGDAkCASAH/YACIgn9Uf2AAiAG/VEiB/2AAv0MAKPA+PphOJtboVmZwjoCYyAAIAAgBv2AAiAJ/VH9gAIgAv1RIgD9gAL9USIGIAb9DQ0ODwwBAgMABQYHBAkKCwj9DADlCxu/ShD1/kFaUa+0pO4gB/2AAv0MANmJOc6nsGngLheefkf3UCAA/YAC/VH9Uf0MAAvALmiN7uUlTWOjhqhGyyAH/YAC/QwAeknBNMaI8ruPTge8ffUzIAD9gAL9USIAIAD9DQoLCAkODwwNAgMAAQYHBAUgACAA/Q0HBAUGCwgJCg8MDQ4DAAEC/VH9Uf1RIQILIARBBHT9AATQgAH9DAB7sD1nkY32RiEcrOrXWsv9DIABCQ4NCwcGDwIMBQoEAwgiACAAIAJBBP1tIgYgAiAB/U4iAf1RIgf9gAL9DIAPDgUHAwsECg0IBgwJAgEgAf2AAiIB/VH9gAIgBv1R/YAC/QwAZJkS5QqL73aTgRhufPf9IAAgACAG/YACIAH9Uf2AAiAH/VH9gAL9USIAIAAgAP0NAAkCCwQNBg8IAQoDDAUOByAEQQxGG/1RC4QRBAJ/AnsBfwt7/QwAZ5fwn/gIbylOvtm20SFGQQAoAsCAASIBQQR0IgL9AATAggEgAP1RIgBBBP1t/YAC/Qx08Y0I/XgEgfZzD4p/+oYDIAD9DA8PDw8PDw8PDw8PDw8PDw8iA/1O/YAC/VEhBAJAIAFBf2oiBUEESQ0AIAJBgIIBaiECA0AgAv0ABAD9DAC6RRYy21PprJ6IzWF3JP8iBv0MgAEJDg0LBwYPAgwFCgQDCCIAIAAgAkEQav0ABAAgBiAAIAAgAkEgav0ABAAgBiAAIAAgAkEwav0ABAD9DAAk/7p3FkVhnulTrDKIzdsiByAAIAAgBEEE/W0iCCAEIAP9TiIE/VEiCf2AAv0MgA8OBQcDCwQKDQgGDAkCASIKIAT9gAIiBP1R/YACIAj9USIL/YAC/QwA2u5Icg6mfJLgqEbUnDo0IgwgACAAIAj9gAIgBP1R/YACIAn9USII/YAC/VEiBCAE/Q0NDg8MAQIDAAUGBwQJCgsIIAYgC/2AAv0MAEimDtQ0qOBGkpw6fHLa7iIEIAj9gAL9Uf1RIAQgC/2AAv0MAMZ/9gZJiU8wNsC/j3nwuSIJIAj9gAL9USINIA39DQoLCAkODwwNAgMAAQYHBAX9DADsKHgNsVC8lJnhyV0ldcQiDSAL/YAC/QwA635AYLU+1avLi/VeHiCVIgsgCP2AAv1RIgggCP0NBwQFBgsICQoPDA0OAwABAv1R/VH9USIIQQT9bSIOIAggA/1OIgj9USIP/YACIAogCP2AAiIQ/VH9gAIgDv1RIgj9gAIgBCAAIAAgDv2AAiAQ/VH9gAIgD/1RIg79gAL9Uf1RIAcgCP2AAiAMIA79gAL9USIPIA/9DQkKCwgNDg8MAQIDAAUGBwT9USAEIAj9gAIgCSAO/YAC/VEiDyAP/Q0CAwABBgcEBQoLCAkODwwNIA0gCP2AAiALIA79gAL9USIIIAj9DQsICQoPDA0OAwABAgcEBQb9Uf1RIghBBP1tIg4gCCAD/U4iCP1RIg/9gAIgCiAI/YACIhD9Uf2AAiAO/VEiCP2AAiAEIAAgACAO/YACIBD9Uf2AAiAP/VEiBv2AAv1R/VEgByAI/YACIAwgBv2AAv1RIg4gDv0NBQYHBAkKCwgNDg8MAQIDAP1RIAQgCP2AAiAJIAb9gAL9USIOIA79DQoLCAkODwwNAgMAAQYHBAUgDSAI/YACIAsgBv2AAv1RIgYgBv0NDwwNDgMAAQIHBAUGCwgJCv1R/VEiBkEE/W0iCCAGIAP9TiIG/VEiDv2AAiAKIAb9gAIiCv1R/YACIAj9USIG/YACIAQgACAAIAj9gAIgCv1R/YACIA79USIA/YAC/VH9USAHIAb9gAIgDCAA/YAC/VEiByAH/Q0BAgMABQYHBAkKCwgNDg8M/VEgBCAG/YACIAkgAP2AAv1RIgQgBP0NAgMAAQYHBAUKCwgJDg8MDSANIAb9gAIgCyAA/YAC/VEiACAA/Q0DAAECBwQFBgsICQoPDA0O/VH9USEEIAJBQGohAiAFQXxqIgVBA0sNAAsLAkAgBUUNACAFQQR0/QAEwIIB/QwAJP+6dxZFYZ7pU6wyiM3bIgv9DIABCQ4NCwcGDwIMBQoEAwgiACAAIARBBP1tIgYgBCAD/U4iBP1RIgf9gAL9DIAPDgUHAwsECg0IBgwJAgEiDCAE/YACIgr9Uf2AAiAG/VEiBP2AAv0MANruSHIOpnyS4KhG1Jw6NCIIIAAgACAG/YACIAr9Uf2AAiAH/VEiBv2AAv1RIgcgB/0NDQ4PDAECAwAFBgcECQoLCP0MALpFFjLbU+msnojNYXck/yIJIAT9gAL9DABIpg7UNKjgRpKcOnxy2u4iByAG/YAC/VH9USAHIAT9gAL9DADGf/YGSYlPMDbAv4958LkiDSAG/YAC/VEiCiAK/Q0KCwgJDg8MDQIDAAEGBwQF/QwA7Ch4DbFQvJSZ4cldJXXEIgogBP2AAv0MAOt+QGC1PtWry4v1Xh4glSIOIAb9gAL9USIEIAT9DQcEBQYLCAkKDwwNDgMAAQL9Uf1R/VEhBCAFQX9qIgJFDQAgAkEEdP0ABMCCASALIAAgACAEQQT9bSIGIAQgA/1OIgT9USIP/YACIAwgBP2AAiIQ/VH9gAIgBv1RIgT9gAIgCCAAIAAgBv2AAiAQ/VH9gAIgD/1RIgb9gAL9USIPIA/9DQkKCwgNDg8MAQIDAAUGBwQgCSAE/YACIAcgBv2AAv1R/VEgByAE/YACIA0gBv2AAv1RIg8gD/0NAgMAAQYHBAUKCwgJDg8MDSAKIAT9gAIgDiAG/YAC/VEiBCAE/Q0LCAkKDwwNDgMAAQIHBAUG/VH9Uf1RIQQgAkEBRg0AQQD9AATQggEgCyAAIAAgBEEE/W0iBiAEIAP9TiIE/VEiD/2AAiAMIAT9gAIiDP1R/YACIAb9USIE/YACIAggACAAIAb9gAIgDP1R/YACIA/9USIA/YAC/VEiBiAG/Q0FBgcECQoLCA0ODwwBAgMAIAkgBP2AAiAHIAD9gAL9Uf1RIAcgBP2AAiANIAD9gAL9USIGIAb9DQoLCAkODwwNAgMAAQYHBAUgCiAE/YACIA4gAP2AAv1RIgAgAP0NDwwNDgMAAQIHBAUGCwgJCv1R/VH9USEEC0EA/QAEwIIB/QwA88jcLMsU5y8D3xc45PA7/QyAAQkODQsHBg8CDAUKBAMIIgAgACAEQQT9bSIGIAQgA/1OIgT9USID/YAC/QyADw4FBwMLBAoNCAYMCQIBIAT9gAIiBP1R/YACIAb9Uf2AAv0MAPKZMJ3GqVvCX2/2NAStayAAIAAgBv2AAiAE/VH9gAIgA/1R/YAC/VEiACAAIAD9DQAJAgsEDQYPCAEKAwwFDgcgAUEMRhv9UQuNDAIMfwZ7IwBBgAJrIgEkAEEAIQIDQCACQcCAAWpCADcDACACQQhqIgJBwApJDQALQQAhAgNAIAJBwIABakIANwMAIAJBCGoiAkHwA0kNAAtBASEDAkAgAEFwaiICQRBLDQBBASACdEGBggRxRQ0AIAFBCHIhBEEAIQJBACAAQQJ2IgVBBmoiBjYCwIABIABBcHEhAwNAIAFBEGogAmogAkGggAFq/QAEAP0LBAAgAyACQRBqIgJHDQALAkAgACADRg0AA0AgAUEQaiADaiADQaCAAWotAAA6AAAgACADQQFqIgNHDQALCyAAQQJ0QfAAaiEHQQAhCCAAQSBHIQlBASEKIAAhCwNAIAEgAUEQaiALaiIDQXxqKAAAIgI2AgACQAJAAkAgCyAAcCIMDQAgASACOgADIAEgAv0RIg39WAACAyABIA39WAABAiABIA39WAAAASABKAIAIQIMAQsgCQ0BIAxBEEcNAQsgAf0MAHuwPWeRjfZGIRys6tday/0MgAEJDg0LBwYPAgwFCgQDCCINIA39DADDXZ5DgB7dXp0DwB3eQIP9DAAAAAAAAAAAAAAAAAAAAAAgAv0cACIOQQT9bf2AAv0MABACEmR0ZnbE1MbWoLCisiAO/QwPDw8PDw8PDw8PDw8PDw8PIg/9Tv2AAv1RIhBBBP1tIg4gECAP/U4iD/1RIhD9gAL9DIAPDgUHAwsECg0IBgwJAgEgD/2AAiIP/VH9gAIgDv1R/YAC/QwAZJkS5QqL73aTgRhufPf9IA0gDyANIA79gAL9Uf2AAiAQ/VH9gAL9Uf0bAEHjxo2bBnMiAjYCACAMDQAgASACIApzOgAAIApBB3ZBmwJsIApBAXRzIQoLIAFBEGogCGohDEEAIQIDQCADIAJqIAEgAmotAAAgDCACai0AAHM6AAAgAkEBaiICQQRHDQALIAhBBGohCCALQQRqIgsgB0kNAAtBACECQQAgAf0ABBAiDf0LBMCCAUEAIA39CwTQgAEgBkEEdCIDIAMgAUEQamr9AAQAIg39CwTAggEgAyAN/QxjY2NjY2NjY2NjY2NjY2Nj/VH9CwTQgAEgAUEQakEQaiEMQQUhAwNA/Qx08Y0I/XgEgfZzD4p/+oYDIAwgAmr9AAQAIg1BB/1s/QwbGxsbGxsbGxsbGxsbGxsbIg79TiANQQH9ayIQ/VEiDyAQQQf9bCAO/U4gD0EB/WsiEf1RIhAgDSARQQf9bCAO/U4gEEEB/Wv9USIR/VEiDv1RIhIgEv0NAgMAAQYHBAUKCwgJDg8MDSAOIA79DQMAAQIHBAUGCwgJCg8MDQ79USAPIA79USIOIA79DQECAwAFBgcECQoLCA0ODwz9Uf1RIBD9USAR/VEiDv0MDw8PDw8PDw8PDw8PDw8PDyIP/U79gAIhEP0MAGeX8J/4CG8pTr7ZttEhRiAOQQT9bf2AAiEO/QwAw12eQ4Ae3V6dA8Ad3kCDIA1BBP1t/YAC/QwAEAISZHRmdsTUxtagsKKyIA0gD/1O/YAC/VH9DAwMDAwMDAwMDAwMDAwMDAz9USENAkACQAJAAkAgA0F6akEDcQ4EAwABAgMLIA0gDf0NAAUKDwQJDgMIDQIHDAEGCyENDAILIA0gDf0NAAkCCwQNBg8IAQoDDAUOByENDAELIA0gDf0NAA0KBwQBDgsIBQIPDAkGAyENCyAOIBD9USEOIAJB4IABaiAN/QsEAAJAAkACQAJAIAUgA2pBA3EOBAMAAQIDCyAOIA79DQAFCg8ECQ4DCA0CBwwBBgshDgwCCyAOIA79DQAJAgsEDQYPCAEKAwwFDgchDgwBCyAOIA79DQANCgcEAQ4LCAUCDwwJBgMhDgsgAkHQggFqIA79CwQAIAJBEGohAiAFIANBf2oiA2oNAAtBACECA0AgAUEQaiACakIANwMAIAJBCGoiAkHwAUkNAAsgASECQQAhAwNAIAJCADcAACAEIQIgA0EIaiIDQRBJDQALQQAhAwtBACECQQBBEDYCoIUBA0AgAkGggAFqQgA3AwAgAkEIaiICQSBJDQALIAFBgAJqJAAgAwsGAEGAgAQLBgBBgIsBCwYAQbCEAQsGAEGggAELBQBB8AQLBgBBwIABCwUAQcAKCwYAQeCKAQueEwIHfw97QQAhBQJAIAIoAgAiBkEQRw0AIANBwABJDQBB4IQBIABrIQdBACEFA0BB4IQBIQhBACEJA0ACQAJAIAcgCUEEdCIGakEPSw0AQQAhBgNAIAggBmogACAGai0AADoAACAGQQFqIgZBEEcNAAwCCwsgBiAA/QAAAP0LBOCEAQtBASEKQRAhBgNAIAZBf2oiBiAAaiILIAogCy0AAGoiCjoAACAKQQh2IQogBiAESw0ACyAIQRBqIQggCUEBaiIJQQRHDQAL/QwAw12eQ4Ae3V6dA8Ad3kCDIgxBAP0ABNCAASINQQD9AASQhQH9USIOQQT9bf2AAv0MABACEmR0ZnbE1MbWoLCisiIPIA79DA8PDw8PDw8PDw8PDw8PDw8iEP1O/YAC/VEhESAMIA1BAP0ABICFAf1RIg5BBP1t/YACIA8gDiAQ/U79gAL9USESIAwgDUEA/QAE8IQB/VEiDkEE/W39gAIgDyAOIBD9Tv2AAv1RIRMgDCANQQD9AATghAH9USINQQT9bf2AAiAPIA0gEP1O/YAC/VEhFAJAQQAoAsCAASILQQJJDQBBASEGQeCAASEKA0AgCv0ABAAhDQJAAkACQAJAIAZBA3EOBAMAAQIDCyANIA39DQAFCg8ECQ4DCA0CBwwBBgshDQwCCyANIA39DQAJAgsEDQYPCAEKAwwFDgchDQwBCyANIA39DQANCgcEAQ4LCAUCDwwJBgMhDQsgDf0MAAvALmiN7uUlTWOjhqhGyyIP/QyAAQkODQsHBg8CDAUKBAMIIgwgDCARIBH9DQAFCg8ECQ4DCA0CBwwBBgsiDkEE/W0iFSAOIBD9TiIW/VEiF/2AAv0MgA8OBQcDCwQKDQgGDAkCASIOIBb9gAIiGP1R/YACIBX9USIR/YAC/QwAeknBNMaI8ruPTge8ffUzIhYgDCAYIAwgFf2AAv1R/YACIBf9USIZ/YAC/VEiFf0MAOULG79KEPX+QVpRr7Sk7iIXIBH9gAL9DADZiTnOp7Bp4C4Xnn5H91AiGCAZ/YAC/VEiEf1RIhkgGf0NAQIDAAUGBwQJCgsIDQ4PDCAVIBX9DQECAwAFBgcECQoLCA0ODwwgFf1RIhUgFf0NAgMAAQYHBAUKCwgJDg8MDf1RIBH9Uf1RIREgDSAPIAwgDCASIBL9DQAFCg8ECQ4DCA0CBwwBBgsiEkEE/W0iFSASIBD9TiIS/VEiGf2AAiAOIBL9gAIiEv1R/YACIBX9USIa/YACIBYgDCASIAwgFf2AAv1R/YACIBn9USIS/YAC/VEiFSAXIBr9gAIgGCAS/YAC/VEiEv1RIhkgGf0NAQIDAAUGBwQJCgsIDQ4PDCAVIBX9DQECAwAFBgcECQoLCA0ODwwgFf1RIhUgFf0NAgMAAQYHBAUKCwgJDg8MDf1RIBL9Uf1RIRIgDSAPIAwgDCATIBP9DQAFCg8ECQ4DCA0CBwwBBgsiE0EE/W0iFSATIBD9TiIT/VEiGf2AAiAOIBP9gAIiE/1R/YACIBX9USIa/YACIBYgDCATIAwgFf2AAv1R/YACIBn9USIT/YAC/VEiFSAXIBr9gAIgGCAT/YAC/VEiE/1RIhkgGf0NAQIDAAUGBwQJCgsIDQ4PDCAVIBX9DQECAwAFBgcECQoLCA0ODwwgFf1RIhUgFf0NAgMAAQYHBAUKCwgJDg8MDf1RIBP9Uf1RIRMgDSAPIAwgDCAUIBT9DQAFCg8ECQ4DCA0CBwwBBgsiFEEE/W0iFSAUIBD9TiIU/VEiGf2AAiAOIBT9gAIiDv1R/YACIBX9USIU/YACIBYgDCAOIAwgFf2AAv1R/YACIBn9USIP/YAC/VEiDCAXIBT9gAIgGCAP/YAC/VEiD/1RIg4gDv0NAQIDAAUGBwQJCgsIDQ4PDCAMIAz9DQECAwAFBgcECQoLCA0ODwwgDP1RIgwgDP0NAgMAAQYHBAUKCwgJDg8MDf1RIA/9Uf1RIRQgCkEQaiEKIAsgBkEBaiIGRw0ACwtBACEGQQAgC0EEdP0ABNCAASIN/QwAe7A9Z5GN9kYhHKzq11rLIg/9DIABCQ4NCwcGDwIMBQoEAwgiDCAMIBFBBP1tIhUgESAQ/U4iFv1RIhf9gAL9DIAPDgUHAwsECg0IBgwJAgEiDiAW/YACIhj9Uf2AAiAV/VH9gAL9DABkmRLlCovvdpOBGG589/0iFiAMIAwgFf2AAiAY/VH9gAIgF/1R/YAC/VEiFSAV/Q0ABQoPBAkOAwgNAgcMAQYL/VH9CwSQhQFBACANIA8gDCAMIBJBBP1tIhUgEiAQ/U4iF/1RIhj9gAIgDiAX/YACIhf9Uf2AAiAV/VH9gAIgFiAMIAwgFf2AAiAX/VH9gAIgGP1R/YAC/VEiFSAV/Q0ABQoPBAkOAwgNAgcMAQYL/VH9CwSAhQFBACANIA8gDCAMIBNBBP1tIhUgEyAQ/U4iF/1RIhj9gAIgDiAX/YACIhf9Uf2AAiAV/VH9gAIgFiAMIAwgFf2AAiAX/VH9gAIgGP1R/YAC/VEiFSAV/Q0ABQoPBAkOAwgNAgcMAQYL/VH9CwTwhAFBACANIA8gDCAMIBRBBP1tIhUgFCAQ/U4iEP1RIhf9gAIgDiAQ/YACIhD9Uf2AAiAV/VH9gAIgFiAMIAwgFf2AAiAQ/VH9gAIgF/1R/YAC/VEiDCAM/Q0ABQoPBAkOAwgNAgcMAQYL/VH9CwTghAEDQCAFIAZqQYCLAWoiCiAK/QAEACAGQeCEAWr9AAQA/VH9CwQAIAZBEGoiBkHAAEcNAAsgBUHAAGohBSACKAIAIgZBEEcNASADIAVrQT9LDQALCwJAIAUgA08NACABIABrQQ9LIQkDQAJAIAZBEEcNAAJAAkAgCQ0AQQAhBgNAIAEgBmogACAGai0AADoAACAGQQFqIgZBEEcNAAsgAf0AAAAhDAwBCyABIAD9AAAAIgz9CwAACyABIAwQAP0LAABBASEKQRAhBgNAIAZBf2oiBiAAaiILIAogCy0AAGoiCjoAACAKQQh2IQogBiAESw0AC0EAIQYgAkEANgIACwJAQRAgBmsiCiADIAVrIgsgCiALSRsiCEUNACAFQYCLAWohBiABIQogCCELA0AgBiAGLQAAIAogAigCAGotAABzOgAAIApBAWohCiAGQQFqIQYgC0F/aiILDQALIAIoAgAhBgsgAiAGIAhqIgY2AgAgCCAFaiIFIANJDQALC0GgBCEGA0AgBkHAgAFqQgA3AwAgBkHoe2ohCiAGQQhqIQYgCkHAAEkNAAsLugECA38Ce0ECIQECQCAAQYCABEsNACAAQQ9xDQBBAyEBQQAoAsCAASICQXZqIgNBBEsNACADQQJ0KAKAgAEhAQJAIAJBdWoOAwEAAQALQQAhAUEA/QAEwIQBIQRBAP0ABLCEASEFAkAgAEUNAANAIAFBgIsBaiECIAIgBSAC/QAEACIFIAT9URAB/VEiBP0LBAAgAUEQaiIBIABJDQALC0EAIQFBACAE/QsEwIQBQQAgBf0LBLCEAQsgAQu6AQIDfwJ7QQIhAQJAIABBgIAESw0AIABBD3ENAEEDIQFBACgCwIABIgJBdmoiA0EESw0AIANBAnQoAoCAASEBAkAgAkF1ag4DAQABAAtBACEBQQD9AATAhAEhBEEA/QAEsIQBIQUCQCAARQ0AA0AgAUGAiwFqIQIgAiAEIAL9AAQAIgQgBf1READ9USIF/QsEACABQRBqIgEgAEkNAAsLQQAhAUEAIAT9CwTAhAFBACAF/QsEsIQBCyABC+c6BwZ/AnsBfwJ+FXsBfwJ+QQIhAQJAIABBgIAESw0AIABBD3ENAAJAQQAoAsCAASICQXZqIgNBBE0NAEEDDwsgA0ECdCgCgIABIQECQCACQXVqDgMBAAEAC0EAIQMCQCAAQcAASQ0AIAJBf2ohBCACQQR0IgNBgIIBaiEFIANBwIIBaiEGQQD9AATAggEhB0EA/QAE0IIBIQggAkEMRiEJQQAhAwNAIAMpA7iLASEKIAMpA7CLASELQQAhAgNAIAJB4IQBaiADIAJqQYCLAWr9AAQA/QsEACACQRBqIgJBwABHDQAL/QwAZ5fwn/gIbylOvtm20SFGIgwgBv0ABAAiDUEA/QAEkIUB/VEiDkEE/W39gAL9DHTxjQj9eASB9nMPin/6hgMiDyAO/QwPDw8PDw8PDw8PDw8PDw8PIhD9Tv2AAv1RIREgDCANQQD9AASAhQH9USIOQQT9bf2AAiAPIA4gEP1O/YAC/VEhEiAMIA1BAP0ABPCEAf1RIg5BBP1t/YACIA8gDiAQ/U79gAL9USETIAwgDUEA/QAE4IQB/VEiDUEE/W39gAIgDyANIBD9Tv2AAv1RIRQCQAJAIARBBE8NACAEIQEMAQsgBSECIAQhAQNAIAL9AAQAIhX9DAC6RRYy21PprJ6IzWF3JP8iD/0MgAEJDg0LBwYPAgwFCgQDCCIMIAz9DABIpg7UNKjgRpKcOnxy2u4iDSAMIAwgDSAMIAwgDSAMIAwgEUEE/W0iFv2AAv0MgA8OBQcDCwQKDQgGDAkCASIOIBEgEP1OIhf9gAIiGP1R/YACIBYgF/1RIhf9USIZ/YACIA8gDCAMIBf9gAIgGP1R/YACIBb9USIa/YAC/VH9DAAk/7p3FkVhnulTrDKIzdsiFiAa/YAC/QwA2u5Icg6mfJLgqEbUnDo0IhcgGf2AAv1RIhggGP0NDQ4PDAECAwAFBgcECQoLCP1R/QwA7Ch4DbFQvJSZ4cldJXXEIhggGv2AAv0MAOt+QGC1PtWry4v1Xh4glSIbIBn9gAL9USIcIBz9DQcEBQYLCAkKDwwNDgMAAQL9USANIBr9gAL9DADGf/YGSYlPMDbAv4958LkiGiAZ/YAC/VEiGSAZ/Q0KCwgJDg8MDQIDAAEGBwQF/VEgAkEwav0ABAAiGf1RIhxBBP1tIh39gAIgDiAcIBD9TiIc/YACIh79Uf2AAiAdIBz9USIf/VEiHP2AAiAPIAwgDCAf/YACIB79Uf2AAiAd/VEiHf2AAv1RIBYgHf2AAiAXIBz9gAL9USIeIB79DQkKCwgNDg8MAQIDAAUGBwT9USAYIB39gAIgGyAc/YAC/VEiHiAe/Q0LCAkKDwwNDgMAAQIHBAUG/VEgDSAd/YACIBogHP2AAv1RIhwgHP0NAgMAAQYHBAUKCwgJDg8MDf1RIAJBIGr9AAQAIhz9USIdQQT9bSIe/YACIA4gHSAQ/U4iHf2AAiIf/VH9gAIgHiAd/VEiEf1RIh39gAIgDyAMIAwgEf2AAiAf/VH9gAIgHv1RIh79gAL9USAWIB79gAIgFyAd/YAC/VEiHyAf/Q0FBgcECQoLCA0ODwwBAgMA/VEgGCAe/YACIBsgHf2AAv1RIh8gH/0NDwwNDgMAAQIHBAUGCwgJCv1RIA0gHv2AAiAaIB39gAL9USIdIB39DQoLCAkODwwNAgMAAQYHBAX9USACQRBq/QAEACId/VEiHkEE/W0iHyAeIBD9TiIe/VEiEf2AAiAOIB79gAIiIP1R/YACIB/9USIe/YACIA0gDCAMIB/9gAIgIP1R/YACIBH9USIf/YAC/VEgFiAe/YACIBcgH/2AAv1RIhEgEf0NAQIDAAUGBwQJCgsIDQ4PDP1RIBggHv2AAiAbIB/9gAL9USIRIBH9DQMAAQIHBAUGCwgJCg8MDQ79USANIB79gAIgGiAf/YAC/VEiHiAe/Q0CAwABBgcEBQoLCAkODwwN/VH9USERIBUgDyAMIAwgDSAMIAwgDSAMIAwgDSAMIAwgEkEE/W0iH/2AAiAOIBIgEP1OIh79gAIiEv1R/YACIB8gHv1RIiD9USIe/YACIA8gDCAMICD9gAIgEv1R/YACIB/9USIf/YAC/VEgFiAf/YACIBcgHv2AAv1RIhIgEv0NDQ4PDAECAwAFBgcECQoLCP1RIBggH/2AAiAbIB79gAL9USISIBL9DQcEBQYLCAkKDwwNDgMAAQL9USANIB/9gAIgGiAe/YAC/VEiHiAe/Q0KCwgJDg8MDQIDAAEGBwQF/VEgGf1RIh5BBP1tIh/9gAIgDiAeIBD9TiIe/YACIhL9Uf2AAiAfIB79USIg/VEiHv2AAiAPIAwgDCAg/YACIBL9Uf2AAiAf/VEiH/2AAv1RIBYgH/2AAiAXIB79gAL9USISIBL9DQkKCwgNDg8MAQIDAAUGBwT9USAYIB/9gAIgGyAe/YAC/VEiEiAS/Q0LCAkKDwwNDgMAAQIHBAUG/VEgDSAf/YACIBogHv2AAv1RIh4gHv0NAgMAAQYHBAUKCwgJDg8MDf1RIBz9USIeQQT9bSIf/YACIA4gHiAQ/U4iHv2AAiIS/VH9gAIgHyAe/VEiIP1RIh79gAIgDyAMIAwgIP2AAiAS/VH9gAIgH/1RIh/9gAL9USAWIB/9gAIgFyAe/YAC/VEiEiAS/Q0FBgcECQoLCA0ODwwBAgMA/VEgGCAf/YACIBsgHv2AAv1RIhIgEv0NDwwNDgMAAQIHBAUGCwgJCv1RIA0gH/2AAiAaIB79gAL9USIeIB79DQoLCAkODwwNAgMAAQYHBAX9USAd/VEiHkEE/W0iHyAeIBD9TiIe/VEiEv2AAiAOIB79gAIiIP1R/YACIB/9USIe/YACIA0gDCAMIB/9gAIgIP1R/YACIBL9USIf/YAC/VEgFiAe/YACIBcgH/2AAv1RIhIgEv0NAQIDAAUGBwQJCgsIDQ4PDP1RIBggHv2AAiAbIB/9gAL9USISIBL9DQMAAQIHBAUGCwgJCg8MDQ79USANIB79gAIgGiAf/YAC/VEiHiAe/Q0CAwABBgcEBQoLCAkODwwN/VH9USESIBUgDyAMIAwgDSAMIAwgDSAMIAwgDSAMIAwgE0EE/W0iH/2AAiAOIBMgEP1OIh79gAIiE/1R/YACIB8gHv1RIiD9USIe/YACIA8gDCAMICD9gAIgE/1R/YACIB/9USIf/YAC/VEgFiAf/YACIBcgHv2AAv1RIhMgE/0NDQ4PDAECAwAFBgcECQoLCP1RIBggH/2AAiAbIB79gAL9USITIBP9DQcEBQYLCAkKDwwNDgMAAQL9USANIB/9gAIgGiAe/YAC/VEiHiAe/Q0KCwgJDg8MDQIDAAEGBwQF/VEgGf1RIh5BBP1tIh/9gAIgDiAeIBD9TiIe/YACIhP9Uf2AAiAfIB79USIg/VEiHv2AAiAPIAwgDCAg/YACIBP9Uf2AAiAf/VEiH/2AAv1RIBYgH/2AAiAXIB79gAL9USITIBP9DQkKCwgNDg8MAQIDAAUGBwT9USAYIB/9gAIgGyAe/YAC/VEiEyAT/Q0LCAkKDwwNDgMAAQIHBAUG/VEgDSAf/YACIBogHv2AAv1RIh4gHv0NAgMAAQYHBAUKCwgJDg8MDf1RIBz9USIeQQT9bSIf/YACIA4gHiAQ/U4iHv2AAiIT/VH9gAIgHyAe/VEiIP1RIh79gAIgDyAMIAwgIP2AAiAT/VH9gAIgH/1RIh/9gAL9USAWIB/9gAIgFyAe/YAC/VEiEyAT/Q0FBgcECQoLCA0ODwwBAgMA/VEgGCAf/YACIBsgHv2AAv1RIhMgE/0NDwwNDgMAAQIHBAUGCwgJCv1RIA0gH/2AAiAaIB79gAL9USIeIB79DQoLCAkODwwNAgMAAQYHBAX9USAd/VEiHkEE/W0iHyAeIBD9TiIe/VEiE/2AAiAOIB79gAIiIP1R/YACIB/9USIe/YACIA0gDCAMIB/9gAIgIP1R/YACIBP9USIf/YAC/VEgFiAe/YACIBcgH/2AAv1RIhMgE/0NAQIDAAUGBwQJCgsIDQ4PDP1RIBggHv2AAiAbIB/9gAL9USITIBP9DQMAAQIHBAUGCwgJCg8MDQ79USANIB79gAIgGiAf/YAC/VEiHiAe/Q0CAwABBgcEBQoLCAkODwwN/VH9USETIBUgDyAMIAwgDSAMIAwgDSAMIAwgDSAMIAwgFEEE/W0iH/2AAiAOIBQgEP1OIh79gAIiFP1R/YACIB8gHv1RIiD9USIe/YACIA8gDCAMICD9gAIgFP1R/YACIB/9USIf/YAC/VEgFiAf/YACIBcgHv2AAv1RIhQgFP0NDQ4PDAECAwAFBgcECQoLCP1RIBggH/2AAiAbIB79gAL9USIUIBT9DQcEBQYLCAkKDwwNDgMAAQL9USANIB/9gAIgGiAe/YAC/VEiHiAe/Q0KCwgJDg8MDQIDAAEGBwQF/VEgGf1RIhlBBP1tIh79gAIgDiAZIBD9TiIZ/YACIh/9Uf2AAiAeIBn9USIU/VEiGf2AAiAPIAwgDCAU/YACIB/9Uf2AAiAe/VEiHv2AAv1RIBYgHv2AAiAXIBn9gAL9USIfIB/9DQkKCwgNDg8MAQIDAAUGBwT9USAYIB79gAIgGyAZ/YAC/VEiHyAf/Q0LCAkKDwwNDgMAAQIHBAUG/VEgDSAe/YACIBogGf2AAv1RIhkgGf0NAgMAAQYHBAUKCwgJDg8MDf1RIBz9USIZQQT9bSIc/YACIA4gGSAQ/U4iGf2AAiIe/VH9gAIgHCAZ/VEiH/1RIhn9gAIgDyAMIAwgH/2AAiAe/VH9gAIgHP1RIhz9gAL9USAWIBz9gAIgFyAZ/YAC/VEiHiAe/Q0FBgcECQoLCA0ODwwBAgMA/VEgGCAc/YACIBsgGf2AAv1RIh4gHv0NDwwNDgMAAQIHBAUGCwgJCv1RIA0gHP2AAiAaIBn9gAL9USIZIBn9DQoLCAkODwwNAgMAAQYHBAX9USAd/VEiHEEE/W0iGSAcIBD9TiIc/VEiHf2AAiAOIBz9gAIiHP1R/YACIBn9USIO/YACIA0gDCAMIBn9gAIgHP1R/YACIB39USIM/YAC/VEgFiAO/YACIBcgDP2AAv1RIg8gD/0NAQIDAAUGBwQJCgsIDQ4PDP1RIBggDv2AAiAbIAz9gAL9USIPIA/9DQMAAQIHBAUGCwgJCg8MDQ79USANIA79gAIgGiAM/YAC/VEiDCAM/Q0CAwABBgcEBQoLCAkODwwN/VH9USEUIAJBQGohAiABQXxqIgFBA0sNAAsLAkAgAUUNACABQQR0/QAEwIIBIhX9DAC6RRYy21PprJ6IzWF3JP8iD/0MgAEJDg0LBwYPAgwFCgQDCCIMIAwgEUEE/W0iFiARIBD9TiIN/VEiF/2AAv0MgA8OBQcDCwQKDQgGDAkCASIOIA39gAIiGP1R/YACIBb9USIa/YAC/QwASKYO1DSo4EaSnDp8ctruIg0gDCAMIBb9gAIgGP1R/YACIBf9USIZ/YAC/VH9DAAk/7p3FkVhnulTrDKIzdsiFiAa/YAC/QwA2u5Icg6mfJLgqEbUnDo0IhcgGf2AAv1RIhggGP0NDQ4PDAECAwAFBgcECQoLCP1R/QwA7Ch4DbFQvJSZ4cldJXXEIhggGv2AAv0MAOt+QGC1PtWry4v1Xh4glSIbIBn9gAL9USIcIBz9DQcEBQYLCAkKDwwNDgMAAQL9USANIBr9gAL9DADGf/YGSYlPMDbAv4958LkiGiAZ/YAC/VEiGSAZ/Q0KCwgJDg8MDQIDAAEGBwQF/VH9USERIBUgDyAMIAwgEkEE/W0iHCASIBD9TiIZ/VEiHf2AAiAOIBn9gAIiHv1R/YACIBz9USIZ/YACIA0gDCAMIBz9gAIgHv1R/YACIB39USIc/YAC/VEgFiAZ/YACIBcgHP2AAv1RIh0gHf0NDQ4PDAECAwAFBgcECQoLCP1RIBggGf2AAiAbIBz9gAL9USIdIB39DQcEBQYLCAkKDwwNDgMAAQL9USANIBn9gAIgGiAc/YAC/VEiGSAZ/Q0KCwgJDg8MDQIDAAEGBwQF/VH9USESIBUgDyAMIAwgE0EE/W0iHCATIBD9TiIZ/VEiHf2AAiAOIBn9gAIiHv1R/YACIBz9USIZ/YACIA0gDCAMIBz9gAIgHv1R/YACIB39USIc/YAC/VEgFiAZ/YACIBcgHP2AAv1RIh0gHf0NDQ4PDAECAwAFBgcECQoLCP1RIBggGf2AAiAbIBz9gAL9USIdIB39DQcEBQYLCAkKDwwNDgMAAQL9USANIBn9gAIgGiAc/YAC/VEiGSAZ/Q0KCwgJDg8MDQIDAAEGBwQF/VH9USETIBUgDyAMIAwgFEEE/W0iHCAUIBD9TiIZ/VEiHf2AAiAOIBn9gAIiHv1R/YACIBz9USIZ/YACIA0gDCAMIBz9gAIgHv1R/YACIB39USIc/YAC/VEgFiAZ/YACIBcgHP2AAv1RIh0gHf0NDQ4PDAECAwAFBgcECQoLCP1RIBggGf2AAiAbIBz9gAL9USIdIB39DQcEBQYLCAkKDwwNDgMAAQL9USANIBn9gAIgGiAc/YAC/VEiGSAZ/Q0KCwgJDg8MDQIDAAEGBwQF/VH9USEUIAFBf2oiAkUNACACQQR0/QAEwIIBIhUgDyAMIAwgEUEE/W0iHCARIBD9TiIZ/VEiHf2AAiAOIBn9gAIiHv1R/YACIBz9USIZ/YACIA0gDCAMIBz9gAIgHv1R/YACIB39USIc/YAC/VEgFiAZ/YACIBcgHP2AAv1RIh0gHf0NCQoLCA0ODwwBAgMABQYHBP1RIBggGf2AAiAbIBz9gAL9USIdIB39DQsICQoPDA0OAwABAgcEBQb9USANIBn9gAIgGiAc/YAC/VEiGSAZ/Q0CAwABBgcEBQoLCAkODwwN/VH9USERIBUgDyAMIAwgEkEE/W0iHCASIBD9TiIZ/VEiHf2AAiAOIBn9gAIiHv1R/YACIBz9USIZ/YACIA0gDCAMIBz9gAIgHv1R/YACIB39USIc/YAC/VEgFiAZ/YACIBcgHP2AAv1RIh0gHf0NCQoLCA0ODwwBAgMABQYHBP1RIBggGf2AAiAbIBz9gAL9USIdIB39DQsICQoPDA0OAwABAgcEBQb9USANIBn9gAIgGiAc/YAC/VEiGSAZ/Q0CAwABBgcEBQoLCAkODwwN/VH9USESIBUgDyAMIAwgE0EE/W0iHCATIBD9TiIZ/VEiHf2AAiAOIBn9gAIiHv1R/YACIBz9USIZ/YACIA0gDCAMIBz9gAIgHv1R/YACIB39USIc/YAC/VEgFiAZ/YACIBcgHP2AAv1RIh0gHf0NCQoLCA0ODwwBAgMABQYHBP1RIBggGf2AAiAbIBz9gAL9USIdIB39DQsICQoPDA0OAwABAgcEBQb9USANIBn9gAIgGiAc/YAC/VEiGSAZ/Q0CAwABBgcEBQoLCAkODwwN/VH9USETIBUgDyAMIAwgFEEE/W0iHCAUIBD9TiIZ/VEiHf2AAiAOIBn9gAIiHv1R/YACIBz9USIZ/YACIA0gDCAMIBz9gAIgHv1R/YACIB39USIc/YAC/VEgFiAZ/YACIBcgHP2AAv1RIh0gHf0NCQoLCA0ODwwBAgMABQYHBP1RIBggGf2AAiAbIBz9gAL9USIdIB39DQsICQoPDA0OAwABAgcEBQb9USANIBn9gAIgGiAc/YAC/VEiGSAZ/Q0CAwABBgcEBQoLCAkODwwN/VH9USEUIAJBAUYNACAIIA8gDCAMIBFBBP1tIhkgESAQ/U4iFf1RIhz9gAIgDiAV/YACIh39Uf2AAiAZ/VEiFf2AAiANIAwgDCAZ/YACIB39Uf2AAiAc/VEiGf2AAv1RIBYgFf2AAiAXIBn9gAL9USIcIBz9DQUGBwQJCgsIDQ4PDAECAwD9USAYIBX9gAIgGyAZ/YAC/VEiHCAc/Q0PDA0OAwABAgcEBQYLCAkK/VEgDSAV/YACIBogGf2AAv1RIhUgFf0NCgsICQ4PDA0CAwABBgcEBf1R/VEhESAIIA8gDCAMIBJBBP1tIhkgEiAQ/U4iFf1RIhz9gAIgDiAV/YACIh39Uf2AAiAZ/VEiFf2AAiANIAwgDCAZ/YACIB39Uf2AAiAc/VEiGf2AAv1RIBYgFf2AAiAXIBn9gAL9USIcIBz9DQUGBwQJCgsIDQ4PDAECAwD9USAYIBX9gAIgGyAZ/YAC/VEiHCAc/Q0PDA0OAwABAgcEBQYLCAkK/VEgDSAV/YACIBogGf2AAv1RIhUgFf0NCgsICQ4PDA0CAwABBgcEBf1R/VEhEiAIIA8gDCAMIBNBBP1tIhkgEyAQ/U4iFf1RIhz9gAIgDiAV/YACIh39Uf2AAiAZ/VEiFf2AAiANIAwgDCAZ/YACIB39Uf2AAiAc/VEiGf2AAv1RIBYgFf2AAiAXIBn9gAL9USIcIBz9DQUGBwQJCgsIDQ4PDAECAwD9USAYIBX9gAIgGyAZ/YAC/VEiHCAc/Q0PDA0OAwABAgcEBQYLCAkK/VEgDSAV/YACIBogGf2AAv1RIhUgFf0NCgsICQ4PDA0CAwABBgcEBf1R/VEhEyAIIA8gDCAMIBRBBP1tIhUgFCAQ/U4iGf1RIhz9gAIgDiAZ/YACIhn9Uf2AAiAV/VEiDv2AAiANIAwgDCAV/YACIBn9Uf2AAiAc/VEiDP2AAv1RIBYgDv2AAiAXIAz9gAL9USIPIA/9DQUGBwQJCgsIDQ4PDAECAwD9USAYIA79gAIgGyAM/YAC/VEiDyAP/Q0PDA0OAwABAgcEBQYLCAkK/VEgDSAO/YACIBogDP2AAv1RIgwgDP0NCgsICQ4PDA0CAwABBgcEBf1R/VEhFAtBACAH/QwA88jcLMsU5y8D3xc45PA7Ig39DIABCQ4NCwcGDwIMBQoEAwgiDCAMIBFBBP1tIhYgESAQ/U4iDv1RIhf9gAL9DIAPDgUHAwsECg0IBgwJAgEiDyAO/YACIhj9Uf2AAiAW/VH9gAL9DADymTCdxqlbwl9v9jQErWsiDiAMIAwgFv2AAiAY/VH9gAIgF/1R/YAC/VEiFiAWIBb9DQAJAgsEDQYPCAEKAwwFDgcgCRv9Uf0LBJCFAUEAIAcgDSAMIAwgEkEE/W0iFiASIBD9TiIX/VEiGP2AAiAPIBf9gAIiF/1R/YACIBb9Uf2AAiAOIAwgDCAW/YACIBf9Uf2AAiAY/VH9gAL9USIWIBYgFv0NAAkCCwQNBg8IAQoDDAUOByAJG/1R/QsEgIUBQQAgByANIAwgDCATQQT9bSIWIBMgEP1OIhf9USIY/YACIA8gF/2AAiIX/VH9gAIgFv1R/YACIA4gDCAMIBb9gAIgF/1R/YACIBj9Uf2AAv1RIhYgFiAW/Q0ACQILBA0GDwgBCgMMBQ4HIAkb/VH9CwTwhAFBACAHIA0gDCAMIBRBBP1tIhYgFCAQ/U4iEP1RIhf9gAIgDyAQ/YACIhD9Uf2AAiAW/VH9gAIgDiAMIAwgFv2AAiAQ/VH9gAIgF/1R/YAC/VEiDCAMIAz9DQAJAgsEDQYPCAEKAwwFDgcgCRv9USIM/QsE4IQBQQkhAUHYBCECA0AgAyACaiIhQeCGAWogIUHQhgFqKQMAIAJBwIABaikDAIU3AwAgAkF4aiECIAFBf2oiAUEDSg0AC0EAKQO4hAEhIkEAIAo3A7iEAUEAKQOwhAEhCkEAIAs3A7CEASADQYCLAWogCiAM/R0AhTcDACADQYiLAWogIiAM/R0BhTcDACAAIANBwABqIgNrQT9LDQALC0F4IQIDQCACQeiEAWpCADcDACACQQhqIgJBMUkNAAtBACEBIAMgAE8NAEEAKQO4hAEhC0EAKQOwhAEhIgNAIANBgIsBaiICKQAAIQogAv0AAAAQASEMQQAgA0GIiwFqIiEpAAAiIzcDuIQBQQAgCjcDsIQBICEgDP0dASALhTcAACACICIgDP0dAIU3AAAgIyELIAohIiADQRBqIgMgAEkNAAsLIAELoAECA38Be0ECIQECQCAAQYCABEsNACAAQQ9xDQBBAyEBQQAoAsCAASICQXZqIgNBBEsNACADQQJ0KAKAgAEhAQJAIAJBdWoOAwEAAQALQQAhAUEA/QAEsIQBIQQCQCAARQ0AA0AgAUGAiwFqIQIgAiAC/QAEACAE/VEQACIE/QsEACABQRBqIgEgAEkNAAsLQQAhAUEAIAT9CwSwhAELIAELYQECfwJAIABBgIAETQ0AQQIPCwJAQQAoAsCAASIBQXZqIgJBBE0NAEEDDwsgAkECdCgCgIABIQICQAJAIAFBdWoOAwEAAQALQQAhAkGwhAFB0IQBQaCFASAAQQAQCwsgAguRAQIDfwJ+AkAgAEGAgARNDQBBAg8LQQMhAQJAQQAoAsCAASICQXZqIgNBBEsNACADQQJ0KAKAgAEhAQJAIAJBdWoOAwEAAQALQQMhAUEAKAL4igFBAkcNAAJAQv//////////H0EAKQOQigEiBH0gAK0iBVoNAEECDwtBACEBQQAgBCAFfDcDkIoBIAAQEgsgAQuRAgEEfwJAIABFDQBBACgC8IoBIQFBACECA0ACQAJAIAAgAmsiA0EQSQ0AIAENACACKQCAiwEgAkGIiwFqKQAAEBQgAkEQaiECQQAoAvCKASEBDAELAkBBECABayIEIAMgBCADSRsiBEUNACACQYCLAWohAUEAIQMDQCADQQAoAvCKAWpBwIoBaiABIANqLQAAOgAAIAQgA0EBaiIDRw0AC0EAKALwigEhAQtBACABIARqIgE2AvCKASAEIAJqIQIgAUEQRw0AQQAhAUEAKQPAigFBACkDyIoBEBRBAEEANgLwigFBACEDQQAhBANAIARCADcDwIoBQQghBCADQQhqIgNBD00NAAsLIAIgAEkNAAsLC/kBAgN/An4CQCAAQYCABE0NAEECDwtBAyEBAkBBACgCwIABIgJBdmoiA0EESw0AIANBAnQoAoCAASEBAkAgAkF1ag4DAQABAAtBAyEBQQAoAviKASICQX5xQQJHDQACQELg/////wFBACkDmIoBIgR9IACtIgVaDQBBAg8LAkAgAkECRw0AQQAhAQJAQQAoAvCKAUUNAEEAKQPAigFBACkDyIoBEBRBAEEANgLwigFBACECA0AgAkIANwPAigFBCCECIAFBCGoiAUEQSQ0AC0EAKQOYigEhBAtBAEEDNgL4igELQQAhAUEAIAQgBXw3A5iKASAAEBILIAELrhAJAXsBfwN7An4BewF/AX4BfwZ+QQBBAP0ABOCHASICQQApA4CKASABQgGIQtWq1arVqtWq1QCDIAFCAYZCqtWq1arVqtWqf4OEIgFCAohCs+bMmbPmzJkzgyABQgKGQsyZs+bMmbPmTIOEIgFCBIhCj568+PDhw4cPgyABQgSGQvDhw4ePnrz4cIOEhSIBQiCIpyID/RH9DBEREREiIiIiRERERIiIiIgiBP1OIgX93gEgAiAF/d8B/VEiAiAC/Q0ICQoLDA0ODwABAgMEBQYHQQD9AATAhwEiAiAF/d4BIAIgBf3fAf1R/VH9DCIiIiIiIiIiiIiIiIiIiIgiAv1OQQD9AATQhwEiBiAF/d4BIAYgBf3fAf1RIgYgBv0NCAkKCwwNDg8AAQIDBAUGB0EA/QAEsIcBIgYgBf3eASAGIAX93wH9Uf1R/QwREREREREREUREREREREREIgX9Tv1QIgb9HQEiB0I/iCAHQj6IhSAG/R0AIAeEIgdCOYiFIghCAYYgCEIChoUgCEIHhoVBAP0ABOCFASIJQQApA/iJASAAQgGIQtWq1arVqtWq1QCDIABCAYZCqtWq1arVqtWqf4OEIgBCAohCs+bMmbPmzJkzgyAAQgKGQsyZs+bMmbPmTIOEIgBCBIhCj568+PDhw4cPgyAAQgSGQvDhw4ePnrz4cIOEhSIApyIK/REgBP1OIgb93gEgCSAG/d8B/VEiCSAJ/Q0ICQoLDA0ODwABAgMEBQYHIAZBAP0ABMCFASIJ/d4BIAYgCf3fAf1R/VEgAv1OIAZBAP0ABNCFASIJ/d4BIAYgCf3fAf1RIgkgCf0NCAkKCwwNDg8AAQIDBAUGByAGQQD9AASwhQEiCf3eASAGIAn93wH9Uf1RIAX9Tv1QIgb9HQAgBv0dAYQiC0EA/QAE4IYBIgkgAEIgiKciDCAKc/0RIAT9TiIG/d4BIAkgBv3fAf1RIgkgCf0NCAkKCwwNDg8AAQIDBAUGB0EA/QAEwIYBIgkgBv3eASAJIAb93wH9Uf1RIAL9TkEA/QAE0IYBIgkgBv3eASAJIAb93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABLCGASIJIAb93gEgCSAG/d8B/VH9USAF/U79UCIG/R0AIAb9HQGEhUEA/QAEoIYBIgkgDP0RIAT9TiIG/d4BIAkgBv3fAf1RIgkgCf0NCAkKCwwNDg8AAQIDBAUGB0EA/QAEgIYBIgkgBv3eASAJIAb93wH9Uf1RIAL9TkEA/QAEkIYBIgkgBv3eASAJIAb93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABPCFASIJIAb93gEgCSAG/d8B/VH9USAF/U79UCIG/R0AIAb9HQGEIg2FIg5BAP0ABOCIASIJIAEgAIUiAKciCv0RIAT9TiIG/d4BIAkgBv3fAf1RIgkgCf0NCAkKCwwNDg8AAQIDBAUGB0EA/QAEwIgBIgkgBv3eASAJIAb93wH9Uf1RIAL9TkEA/QAE0IgBIgkgBv3eASAJIAb93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABLCIASIJIAb93gEgCSAG/d8B/VH9USAF/U79UCIG/R0AIAb9HQGEIg9BAP0ABOCJASIJIABCIIinIgwgCnP9ESAE/U4iBv3eASAJIAb93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABMCJASIJIAb93gEgCSAG/d8B/VH9USAC/U5BAP0ABNCJASIJIAb93gEgCSAG/d8B/VEiCSAJ/Q0ICQoLDA0ODwABAgMEBQYHQQD9AASwiQEiCSAG/d4BIAkgBv3fAf1R/VEgBf1O/VAiBv0dACAG/R0BhIVBAP0ABKCJASIJIAz9ESAE/U4iBv3eASAJIAb93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABICJASIJIAb93gEgCSAG/d8B/VH9USAC/U5BAP0ABJCJASIJIAb93gEgCSAG/d8B/VEiCSAJ/Q0ICQoLDA0ODwABAgMEBQYHQQD9AATwiAEiCSAG/d4BIAkgBv3fAf1R/VEgBf1O/VAiBv0dACAG/R0BhCIQhSIRQQD9AASghwEiCSABpyIK/REgBP1OIgb93gEgCSAG/d8B/VEiCSAJ/Q0ICQoLDA0ODwABAgMEBQYHQQD9AASAhwEiCSAG/d4BIAkgBv3fAf1R/VEgAv1OQQD9AASQhwEiCSAG/d4BIAkgBv3fAf1RIgkgCf0NCAkKCwwNDg8AAQIDBAUGB0EA/QAE8IYBIgkgBv3eASAJIAb93wH9Uf1RIAX9Tv1QIgb9HQAgBv0dAYQiAUEA/QAEoIgBIgYgAyAKc/0RIAT9TiIE/d4BIAYgBP3fAf1RIgYgBv0NCAkKCwwNDg8AAQIDBAUGB0EA/QAEgIgBIgYgBP3eASAGIAT93wH9Uf1RIAL9TkEA/QAEkIgBIgIgBP3eASACIAT93wH9USICIAL9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABPCHASICIAT93gEgAiAE/d8B/VH9USAF/U79UCIE/R0AIAT9HQGEhSAHhSIAhYVCIIggDYUgAEIghiABhSIShSAHhSAQhSIBQgKGhSABQgGGhSABQgeGhSAOQiCGIAuFIguFIAiFIAGFNwP4iQFBACARQiCGIA5CIIiEIAFCPoiFIAFCOYiFIAFCP4ggAEIgiCAHhSIBQgGGIAFCAoaFIAFCB4aFhIUgDYUgEoUgC4UgD4UgAYU3A4CKAQvHAgICfwF7AkBBACgCwIABQXZqIgFBBE0NAEEDDwsgAUEBRiABQQNGciECAkACQCAAQQFLDQAgAkUNAQsgAUECdCgCgIABQQIgAhsPC0EAIQECQEEAKALwiQENAEEDDwsDQCABQfiJAWpCADcDACABQQhqIgFBiAFJDQALQQAhAUEAQQE2AviKAQJAIABFDQBBdCEBA0AgAUGsigFqIAFBvIQBai0AADoAACABQQFqIgENAAtBASEAQQBBAToAr4oBQQBBAP0ABKCKASID/QsEsIoBQQAgAxAA/QsEsIoBQe8JIQEDQCABQcCAAWoiAiAAIAItAABqIgA6AAAgAEEIdiEAIAFBoXZqIQIgAUF/aiEBIAJBDUoNAAtBACEBQQD9DAAAAAAAAAAAAAAAAAAAAAD9CwP4iQFBAEKQgICAIDcC9IoBCyABC5QBAgN/An4CQCAAQYCABE0NAEECDwtBAyEBAkBBACgCwIABIgJBdmoiA0EESw0AIANBAnQoAoCAASEBAkAgAkF1ag4DAQABAAtBAyEBQQAoAviKAUEFRw0AAkBBACkDmIoBIgQgAK0iBVoNAEECDwtBACEBQQAgBCAFfTcDmIoBQaCKAUHQigFB9IoBIABBDBALCyABC4sCAgN/An4CQCAAQYCABE0NAEECDwtBAyEBAkBBACgCwIABIgJBdmoiA0EESw0AIANBAnQoAoCAASEBAkAgAkF1ag4DAQABAAtBAyEBQQAoAviKASICQX5xQQJHDQACQELg/////wFBACkDmIoBIgR9IACtIgVaDQBBAg8LAkAgAkECRw0AQQAhAQJAQQAoAvCKAUUNAEEAKQPAigFBACkDyIoBEBRBAEEANgLwigFBACECA0AgAkIANwPAigFBCCECIAFBCGoiAUEQSQ0AC0EAKQOYigEhBAtBAEEDNgL4igELQQAhAUEAIAQgBXw3A5iKAUGgigFB0IoBQfSKASAAQQwQCyAAEBILIAELkQECA38CfgJAIABBgIAETQ0AQQIPC0EDIQECQEEAKALAgAEiAkF2aiIDQQRLDQAgA0ECdCgCgIABIQECQCACQXVqDgMBAAEAC0EDIQFBACgC+IoBQQFHDQACQEL//////////x9BACkDiIoBIgR9IACtIgVaDQBBAg8LQQAhAUEAIAQgBXw3A4iKASAAEBILIAELhgUFAX8BfgF/AXsBf0EDIQACQEEAKAL4igFBAUcNAEEAKQOIigEiAVANAEEAIQACQEEAKALwigFFDQBBACkDwIoBQQApA8iKARAUQQBBADYC8IoBQQAhAgNAIAJCADcDwIoBQQghAiAAQQhqIgBBEEkNAAtBACkDiIoBIQELQQAhAEEAIAFCO4YgAUIrhkKAgICAgIDA/wCDhCABQhuGQoCAgICA4D+DIAFCC4ZCgICAgPAfg4SEIAFCBYhCgICA+A+DIAFCFYhCgID8B4OEIAFCJYhCgP4DgyABQgOGQjiIhISEIgE3A8iKAUEAKQPAigEgARAUQQAhAgNAIAJCADcDwIoBQQghAiAAQQhqIgBBEEkNAAtBAEEAKQP4iQEiAUIBiELVqtWq1arVqtUAgyABQgGGQqrVqtWq1arVqn+DhCIBQgKIQrPmzJmz5syZM4MgAUIChkLMmbPmzJmz5kyDhCIBQgSIQo+evPjw4cOHD4MgAUIEhkLw4cOHj568+HCDhDcDoIoBQQBBACkDgIoBIgFCAYhC1arVqtWq1arVAIMgAUIBhkKq1arVqtWq1ap/g4QiAUICiEKz5syZs+bMmTODIAFCAoZCzJmz5syZs+ZMg4QiAUIEiEKPnrz48OHDhw+DIAFCBIZC8OHDh4+evPhwg4Q3A6iKAUEAQQD9AASgigEiA/0LBLCKAUEAIAMQAP0LBLCKAUEBIQJB7wkhAANAIABBwIABaiIEIAIgBC0AAGoiAjoAACACQQh2IQIgAEGhdmohBCAAQX9qIQAgBEENSg0AC0EAIQBBAP0MAAAAAAAAAAAAAAAAAAAAAP0LA/iJAUEAQpCAgIAgNwL0igELIAALjAcEBH8BewJ+BX8jAEEwayIAJABBAyEBAkBBACgCwIABIgJBdmoiA0EESw0AIANBAnQoAoCAASEBAkAgAkF1ag4DAQABAAsgAP0MAAAAAAAAAAAAAAAAAAAAABAAIgT9HQAiBUIBiELVqtWq1arVqtUAgyAFQgGGQqrVqtWq1arVqn+DhCIFQgKIQrPmzJmz5syZM4MgBUIChkLMmbPmzJmz5kyDhCIFQgSIQo+evPjw4cOHD4MgBUIEhkLw4cOHj568+HCDhCIFNwMQIAAgBP0dASIGQgGIQtWq1arVqtWq1QCDIAZCAYZCqtWq1arVqtWqf4OEIgZCAohCs+bMmbPmzJkzgyAGQgKGQsyZs+bMmbPmTIOEIgZCBIhCj568+PDhw4cPgyAGQgSGQvDhw4ePnrz4cIOEIgY3AxggACAGIAWFNwMgQcB7IQEgAEEQaiEHA0AgAUGgigFqIAcpAwAiBaciAkGIkaLEeHEiA/0RIAJBkaLEiAFxIgj9HAEgAkGixIiRAnEiCf0cAiACQcSIkaIEcSIK/RwD/QsEACABQZCKAWogCv0RIAP9HAEgCP0cAiAJ/RwD/QsEACABQYCKAWogCf0RIAr9HAEgA/0cAiAI/RwD/QsEACABQfCJAWogCP0RIAn9HAEgCv0cAiAD/RwD/QsEACABQeCKAWogBUIgiKciA0GIkaLEeHEiCP0RIANBkaLEiAFxIgn9HAEgA0GixIiRAnEiCv0cAiADQcSIkaIEcSIL/RwD/QsEACABQdCKAWogC/0RIAj9HAEgCf0cAiAK/RwD/QsEACABQcCKAWogCv0RIAv9HAEgCP0cAiAJ/RwD/QsEACABQbCKAWogCf0RIAr9HAEgC/0cAiAI/RwD/QsEACABQaCLAWogAyACcyICQYiRosR4cSID/REgAkGRosSIAXEiCP0cASACQaLEiJECcSIJ/RwCIAJBxIiRogRxIgL9HAP9CwQAIAFBkIsBaiAC/REgA/0cASAI/RwCIAn9HAP9CwQAIAFBgIsBaiAJ/REgAv0cASAD/RwCIAj9HAP9CwQAIAFB8IoBaiAI/REgCf0cASAC/RwCIAP9HAP9CwQAIAdBCGohByABQcABaiIBDQALIABBEGohAUEAIQIDQCABQgA3AwAgAEEIaiEBIAJBCGoiAkEQSQ0AC0EAIQFBAEEBNgLwiQELIABBMGokACABC98FAgJ/An5BAyEAAkBBACgC+IoBIgFBfnFBAkcNAEEAKALwigEhAAJAAkAgAUECRw0AAkAgAEUNAEEAIQBBACkDwIoBQQApA8iKARAUQQBBADYC8IoBQQAhAQNAIAFCADcDwIoBQQghASAAQQhqIgBBEEkNAAsLQQBBAzYC+IoBDAELIABFDQBBACEAQQApA8CKAUEAKQPIigEQFEEAQQA2AvCKAUEAIQEDQCABQgA3A8CKAUEIIQEgAEEIaiIAQRBJDQALC0EAIQBBAEEAKQOQigEiAkI7hiACQiuGQoCAgICAgMD/AIOEIAJCG4ZCgICAgIDgP4MgAkILhkKAgICA8B+DhIQgAkIFiEKAgID4D4MgAkIViEKAgPwHg4QgAkIliEKA/gODIAJCA4ZCOIiEhIQiAzcDwIoBQQBBACkDmIoBIgJCO4YgAkIrhkKAgICAgIDA/wCDhCACQhuGQoCAgICA4D+DIAJCC4ZCgICAgPAfg4SEIAJCBYhCgICA+A+DIAJCFYhCgID8B4OEIAJCJYhCgP4DgyACQgOGQjiIhISEIgI3A8iKASADIAIQFEEAIQEDQCABQgA3A8CKAUEIIQEgAEEIaiIAQRBJDQALQQAhAEEAQQApA/iJASICQgGIQtWq1arVqtWq1QCDIAJCAYZCqtWq1arVqtWqf4OEIgJCAohCs+bMmbPmzJkzgyACQgKGQsyZs+bMmbPmTIOEIgJCBIhCj568+PDhw4cPgyACQgSGQvDhw4ePnrz4cIOENwPgigFBAEEAKQOAigEiAkIBiELVqtWq1arVqtUAgyACQgGGQqrVqtWq1arVqn+DhCICQgKIQrPmzJmz5syZM4MgAkIChkLMmbPmzJmz5kyDhCICQgSIQo+evPjw4cOHD4MgAkIEhkLw4cOHj568+HCDhDcD6IoBQQBBBDYC+IoBQQBBAP0ABOCKAUEA/QAEsIoB/VH9CwTgigELIAALmgICAn8Be0EDIQECQCAAQW9qQXtJDQBBACgC+IoBQQRHDQAgAEEccSEC/QwAAAAAAAAAAAAAAAAAAAAAIQNBACEBA0AgAyABQYCLAWooAgAgAUHgigFqKAIAc/0R/YkB/akB/VAhAyACIAFBBGoiAUcNAAsgAyADIAP9DQgJCgsMDQ4PAAECAwABAgP9UCIDIAMgA/0NBAUGBwABAgMAAQIDAAECA/1Q/RsAIQECQCAAIAJGDQADQCABIAJBgIsBai0AACACQeCKAWotAABzciEBIAAgAkEBaiICRw0ACwsCQCABRQ0AQQAhAQNAIAFB+IkBakIANwMAIAFBCGoiAUGHAU0NAAtBBA8LQQAhAUEAQQU2AviKAQsgAQsLHAEAQYCAAQsUAAAAAAMAAAAAAAAAAwAAAAAAAAA=", "AGFzbQEAAAABIAZgAXsBe2ABfwF/YAABf2AFf39/f38AYAF/AGACfn4AAx4dAAABAgICAgICAgIDAQEBAQEBBAEFAQEBAQICAgEEBQFwAQEBBQQBAQICBggBfwFBgIABCwfGAhkGbWVtb3J5AgAJc3RhdGVfcHRyAAgKc3RhdGVfc2l6ZQAJEXN0YXRlX2NpcGhlcl9zaXplAAcHa2V5X3B0cgAGBml2X3B0cgAFB3RhZ19wdHIACglpbnB1dF9wdHIABA5pbnB1dF9jYXBhY2l0eQADBGluaXQAAgtpZ2VfZW5jcnlwdAANC2lnZV9kZWNyeXB0AAwLY2JjX2VuY3J5cHQADwtjYmNfZGVjcnlwdAAODWN0cl90cmFuc2Zvcm0AEAtnY21fcHJlcGFyZQAaCWdjbV9iZWdpbgAVCWdjbV9ub25jZQAYDWdjbV9ub25jZV9lbmQAGQdnY21fYWFkABELZ2NtX2VuY3J5cHQAFxBnY21fYXV0aGVudGljYXRlABMHZ2NtX3RhZwAbCmdjbV92ZXJpZnkAHAtnY21fZGVjcnlwdAAWCp2uAR2wEQMCewN/Cnv9DADDXZ5DgB7dXp0DwB3eQINBAP0ABNCAASAA/VEiAEEE/W39Dv0MABACEmR0ZnbE1MbWoLCisiAA/QwPDw8PDw8PDw8PDw8PDw8PIgH9Tv0O/VEhAkEBIQMCQEEAKALAgAEiBEEFSQ0AQZCBASEDQQQhBQNAIAP9AAQA/QwA5Qsbv0oQ9f5BWlGvtKTuIgb9DIABCQ4NCwcGDwIMBQoEAwgiACAAIANBcGr9AAQAIAYgACAAIANBYGr9AAQAIAYgACAAIANBUGr9AAQA/QwA7ss118f+ENsMOfIpHOIlIgcgACAAIAJBBP1tIgggAiAB/U4iCf1RIgr9Dv0MgA8OBQcDCwQKDQgGDAkCASICIAn9DiIL/VH9DiAI/VEiDP0O/QwAo8D4+mE4m1uhWZnCOgJjIgkgACAAIAj9DiAL/VH9DiAK/VEiC/0O/VEiCCAI/Q0FBgcECQoLCA0ODwwBAgMAIAYgDP0O/QwA2Yk5zqewaeAuF55+R/dQIgggC/0O/VH9Uf0MAAvALmiN7uUlTWOjhqhGyyIKIAz9Dv0MAHpJwTTGiPK7j04HvH31MyIMIAv9Dv1RIgsgC/0NCgsICQ4PDA0CAwABBgcEBSALIAv9DQ8MDQ4DAAECBwQFBgsICQr9Uf1R/VEiDUEE/W0iCyANIAH9TiIN/VEiDv0OIAIgDf0OIg/9Uf0OIAv9USIN/Q4gCCAAIAAgC/0OIA/9Uf0OIA79USIL/Q79Uf1RIAcgDf0OIAkgC/0O/VEiDiAO/Q0JCgsIDQ4PDAECAwAFBgcE/VEgCiAN/Q4gDCAL/Q79USILIAv9DQIDAAEGBwQFCgsICQ4PDA0gCyAL/Q0LCAkKDwwNDgMAAQIHBAUG/VH9USINQQT9bSILIA0gAf1OIg39USIO/Q4gAiAN/Q4iD/1R/Q4gC/1RIg39DiAIIAAgACAL/Q4gD/1R/Q4gDv1RIgb9Dv1R/VEgByAN/Q4gCSAG/Q79USILIAv9DQ0ODwwBAgMABQYHBAkKCwj9USAKIA39DiAMIAb9Dv1RIgYgBv0NCgsICQ4PDA0CAwABBgcEBSAGIAb9DQcEBQYLCAkKDwwNDgMAAQL9Uf1RIgtBBP1tIgYgCyAB/U4iC/1RIg39DiACIAv9DiIL/VH9DiAG/VEiAv0OIAggACAAIAb9DiAL/VH9DiAN/VEiAP0O/VH9USAHIAL9DiAJIAD9Dv1RIgYgBv0NAQIDAAUGBwQJCgsIDQ4PDP1RIAogAv0OIAwgAP0O/VEiACAA/Q0CAwABBgcEBQoLCAkODwwNIAAgAP0NAwABAgcEBQYLCAkKDwwNDv1R/VEhAiADQcAAaiEDIAVBBGoiBSAESQ0ACyAEQXtqQXxxQQVqIQMLAkAgAyAETw0AIANBBHT9AATQgAH9DADuyzXXx/4Q2ww58ikc4iX9DIABCQ4NCwcGDwIMBQoEAwgiACAAIAJBBP1tIgYgAiAB/U4iB/1RIgL9Dv0MgA8OBQcDCwQKDQgGDAkCASAH/Q4iCf1R/Q4gBv1RIgf9Dv0MAKPA+PphOJtboVmZwjoCYyAAIAAgBv0OIAn9Uf0OIAL9USIA/Q79USIGIAb9DQUGBwQJCgsIDQ4PDAECAwD9DADlCxu/ShD1/kFaUa+0pO4gB/0O/QwA2Yk5zqewaeAuF55+R/dQIAD9Dv1R/VH9DAALwC5oje7lJU1jo4aoRssgB/0O/QwAeknBNMaI8ruPTge8ffUzIAD9Dv1RIgAgAP0NCgsICQ4PDA0CAwABBgcEBSAAIAD9DQ8MDQ4DAAECBwQFBgsICQr9Uf1R/VEhAiADQQFqIQMLAkAgAyAETw0AIANBBHT9AATQgAH9DADuyzXXx/4Q2ww58ikc4iX9DIABCQ4NCwcGDwIMBQoEAwgiACAAIAJBBP1tIgYgAiAB/U4iB/1RIgL9Dv0MgA8OBQcDCwQKDQgGDAkCASAH/Q4iCf1R/Q4gBv1RIgf9Dv0MAKPA+PphOJtboVmZwjoCYyAAIAAgBv0OIAn9Uf0OIAL9USIA/Q79USIGIAb9DQkKCwgNDg8MAQIDAAUGBwT9DADlCxu/ShD1/kFaUa+0pO4gB/0O/QwA2Yk5zqewaeAuF55+R/dQIAD9Dv1R/VH9DAALwC5oje7lJU1jo4aoRssgB/0O/QwAeknBNMaI8ruPTge8ffUzIAD9Dv1RIgAgAP0NAgMAAQYHBAUKCwgJDg8MDSAAIAD9DQsICQoPDA0OAwABAgcEBQb9Uf1R/VEhAiADQQFqIQMLAkAgAyAETw0AIANBBHT9AATQgAH9DADuyzXXx/4Q2ww58ikc4iX9DIABCQ4NCwcGDwIMBQoEAwgiACAAIAJBBP1tIgYgAiAB/U4iB/1RIgL9Dv0MgA8OBQcDCwQKDQgGDAkCASAH/Q4iCf1R/Q4gBv1RIgf9Dv0MAKPA+PphOJtboVmZwjoCYyAAIAAgBv0OIAn9Uf0OIAL9USIA/Q79USIGIAb9DQ0ODwwBAgMABQYHBAkKCwj9DADlCxu/ShD1/kFaUa+0pO4gB/0O/QwA2Yk5zqewaeAuF55+R/dQIAD9Dv1R/VH9DAALwC5oje7lJU1jo4aoRssgB/0O/QwAeknBNMaI8ruPTge8ffUzIAD9Dv1RIgAgAP0NCgsICQ4PDA0CAwABBgcEBSAAIAD9DQcEBQYLCAkKDwwNDgMAAQL9Uf1R/VEhAgsgBEEEdP0ABNCAAf0MAHuwPWeRjfZGIRys6tday/0MgAEJDg0LBwYPAgwFCgQDCCIAIAAgAkEE/W0iBiACIAH9TiIB/VEiB/0O/QyADw4FBwMLBAoNCAYMCQIBIAH9DiIB/VH9DiAG/VH9Dv0MAGSZEuUKi+92k4EYbnz3/SAAIAAgBv0OIAH9Uf0OIAf9Uf0O/VEiACAAIAD9DQAJAgsEDQYPCAEKAwwFDgcgBEEMRhv9UQugEAQCfwJ7AX8Le/0MAGeX8J/4CG8pTr7ZttEhRkEAKALAgAEiAUEEdCIC/QAEwIIBIAD9USIAQQT9bf0O/Qx08Y0I/XgEgfZzD4p/+oYDIAD9DA8PDw8PDw8PDw8PDw8PDw8iA/1O/Q79USEEAkAgAUF/aiIFQQRJDQAgAkGAggFqIQIDQCAC/QAEAP0MALpFFjLbU+msnojNYXck/yIG/QyAAQkODQsHBg8CDAUKBAMIIgAgACACQRBq/QAEACAGIAAgACACQSBq/QAEACAGIAAgACACQTBq/QAEAP0MACT/uncWRWGe6VOsMojN2yIHIAAgACAEQQT9bSIIIAQgA/1OIgT9USIJ/Q79DIAPDgUHAwsECg0IBgwJAgEiCiAE/Q4iBP1R/Q4gCP1RIgv9Dv0MANruSHIOpnyS4KhG1Jw6NCIMIAAgACAI/Q4gBP1R/Q4gCf1RIgj9Dv1RIgQgBP0NDQ4PDAECAwAFBgcECQoLCCAGIAv9Dv0MAEimDtQ0qOBGkpw6fHLa7iIEIAj9Dv1R/VEgBCAL/Q79DADGf/YGSYlPMDbAv4958LkiCSAI/Q79USINIA39DQoLCAkODwwNAgMAAQYHBAX9DADsKHgNsVC8lJnhyV0ldcQiDSAL/Q79DADrfkBgtT7Vq8uL9V4eIJUiCyAI/Q79USIIIAj9DQcEBQYLCAkKDwwNDgMAAQL9Uf1R/VEiCEEE/W0iDiAIIAP9TiII/VEiD/0OIAogCP0OIhD9Uf0OIA79USII/Q4gBCAAIAAgDv0OIBD9Uf0OIA/9USIO/Q79Uf1RIAcgCP0OIAwgDv0O/VEiDyAP/Q0JCgsIDQ4PDAECAwAFBgcE/VEgBCAI/Q4gCSAO/Q79USIPIA/9DQIDAAEGBwQFCgsICQ4PDA0gDSAI/Q4gCyAO/Q79USIIIAj9DQsICQoPDA0OAwABAgcEBQb9Uf1RIghBBP1tIg4gCCAD/U4iCP1RIg/9DiAKIAj9DiIQ/VH9DiAO/VEiCP0OIAQgACAAIA79DiAQ/VH9DiAP/VEiBv0O/VH9USAHIAj9DiAMIAb9Dv1RIg4gDv0NBQYHBAkKCwgNDg8MAQIDAP1RIAQgCP0OIAkgBv0O/VEiDiAO/Q0KCwgJDg8MDQIDAAEGBwQFIA0gCP0OIAsgBv0O/VEiBiAG/Q0PDA0OAwABAgcEBQYLCAkK/VH9USIGQQT9bSIIIAYgA/1OIgb9USIO/Q4gCiAG/Q4iCv1R/Q4gCP1RIgb9DiAEIAAgACAI/Q4gCv1R/Q4gDv1RIgD9Dv1R/VEgByAG/Q4gDCAA/Q79USIHIAf9DQECAwAFBgcECQoLCA0ODwz9USAEIAb9DiAJIAD9Dv1RIgQgBP0NAgMAAQYHBAUKCwgJDg8MDSANIAb9DiALIAD9Dv1RIgAgAP0NAwABAgcEBQYLCAkKDwwNDv1R/VEhBCACQUBqIQIgBUF8aiIFQQNLDQALCwJAIAVFDQAgBUEEdP0ABMCCAf0MACT/uncWRWGe6VOsMojN2yIL/QyAAQkODQsHBg8CDAUKBAMIIgAgACAEQQT9bSIGIAQgA/1OIgT9USIH/Q79DIAPDgUHAwsECg0IBgwJAgEiDCAE/Q4iCv1R/Q4gBv1RIgT9Dv0MANruSHIOpnyS4KhG1Jw6NCIIIAAgACAG/Q4gCv1R/Q4gB/1RIgb9Dv1RIgcgB/0NDQ4PDAECAwAFBgcECQoLCP0MALpFFjLbU+msnojNYXck/yIJIAT9Dv0MAEimDtQ0qOBGkpw6fHLa7iIHIAb9Dv1R/VEgByAE/Q79DADGf/YGSYlPMDbAv4958LkiDSAG/Q79USIKIAr9DQoLCAkODwwNAgMAAQYHBAX9DADsKHgNsVC8lJnhyV0ldcQiCiAE/Q79DADrfkBgtT7Vq8uL9V4eIJUiDiAG/Q79USIEIAT9DQcEBQYLCAkKDwwNDgMAAQL9Uf1R/VEhBCAFQX9qIgJFDQAgAkEEdP0ABMCCASALIAAgACAEQQT9bSIGIAQgA/1OIgT9USIP/Q4gDCAE/Q4iEP1R/Q4gBv1RIgT9DiAIIAAgACAG/Q4gEP1R/Q4gD/1RIgb9Dv1RIg8gD/0NCQoLCA0ODwwBAgMABQYHBCAJIAT9DiAHIAb9Dv1R/VEgByAE/Q4gDSAG/Q79USIPIA/9DQIDAAEGBwQFCgsICQ4PDA0gCiAE/Q4gDiAG/Q79USIEIAT9DQsICQoPDA0OAwABAgcEBQb9Uf1R/VEhBCACQQFGDQBBAP0ABNCCASALIAAgACAEQQT9bSIGIAQgA/1OIgT9USIP/Q4gDCAE/Q4iDP1R/Q4gBv1RIgT9DiAIIAAgACAG/Q4gDP1R/Q4gD/1RIgD9Dv1RIgYgBv0NBQYHBAkKCwgNDg8MAQIDACAJIAT9DiAHIAD9Dv1R/VEgByAE/Q4gDSAA/Q79USIGIAb9DQoLCAkODwwNAgMAAQYHBAUgCiAE/Q4gDiAA/Q79USIAIAD9DQ8MDQ4DAAECBwQFBgsICQr9Uf1R/VEhBAtBAP0ABMCCAf0MAPPI3CzLFOcvA98XOOTwO/0MgAEJDg0LBwYPAgwFCgQDCCIAIAAgBEEE/W0iBiAEIAP9TiIE/VEiA/0O/QyADw4FBwMLBAoNCAYMCQIBIAT9DiIE/VH9DiAG/VH9Dv0MAPKZMJ3GqVvCX2/2NAStayAAIAAgBv0OIAT9Uf0OIAP9Uf0O/VEiACAAIAD9DQAJAgsEDQYPCAEKAwwFDgcgAUEMRhv9UQuADAIMfwZ7IwBBgAJrIgEkAEEAIQIDQCACQcCAAWpCADcDACACQQhqIgJBwApJDQALQQAhAgNAIAJBwIABakIANwMAIAJBCGoiAkHwA0kNAAtBASEDAkAgAEFwaiICQRBLDQBBASACdEGBggRxRQ0AIAFBCHIhBEEAIQJBACAAQQJ2IgVBBmoiBjYCwIABIABBcHEhAwNAIAFBEGogAmogAkGggAFq/QAEAP0LBAAgAyACQRBqIgJHDQALAkAgACADRg0AA0AgAUEQaiADaiADQaCAAWotAAA6AAAgACADQQFqIgNHDQALCyAAQQJ0QfAAaiEHQQAhCCAAQSBHIQlBASEKIAAhCwNAIAEgAUEQaiALaiIDQXxqKAAAIgI2AgACQAJAAkAgCyAAcCIMDQAgASACOgADIAEgAv0RIg39WAACAyABIA39WAABAiABIA39WAAAASABKAIAIQIMAQsgCQ0BIAxBEEcNAQsgAf0MAHuwPWeRjfZGIRys6tday/0MgAEJDg0LBwYPAgwFCgQDCCINIA39DADDXZ5DgB7dXp0DwB3eQIP9DAAAAAAAAAAAAAAAAAAAAAAgAv0cACIOQQT9bf0O/QwAEAISZHRmdsTUxtagsKKyIA79DA8PDw8PDw8PDw8PDw8PDw8iD/1O/Q79USIQQQT9bSIOIBAgD/1OIg/9USIQ/Q79DIAPDgUHAwsECg0IBgwJAgEgD/0OIg/9Uf0OIA79Uf0O/QwAZJkS5QqL73aTgRhufPf9IA0gDyANIA79Dv1R/Q4gEP1R/Q79Uf0bAEHjxo2bBnMiAjYCACAMDQAgASACIApzOgAAIApBB3ZBmwJsIApBAXRzIQoLIAFBEGogCGohDEEAIQIDQCADIAJqIAEgAmotAAAgDCACai0AAHM6AAAgAkEBaiICQQRHDQALIAhBBGohCCALQQRqIgsgB0kNAAtBACECQQAgAf0ABBAiDf0LBMCCAUEAIA39CwTQgAEgBkEEdCIDIAMgAUEQamr9AAQAIg39CwTAggEgAyAN/QxjY2NjY2NjY2NjY2NjY2Nj/VH9CwTQgAEgAUEQakEQaiEMQQUhAwNA/Qx08Y0I/XgEgfZzD4p/+oYDIAwgAmr9AAQAIg1BB/1s/QwbGxsbGxsbGxsbGxsbGxsbIg79TiANQQH9ayIQ/VEiDyAQQQf9bCAO/U4gD0EB/WsiEf1RIhAgDSARQQf9bCAO/U4gEEEB/Wv9USIR/VEiDv1RIhIgEv0NAgMAAQYHBAUKCwgJDg8MDSAOIA79DQMAAQIHBAUGCwgJCg8MDQ79USAPIA79USIOIA79DQECAwAFBgcECQoLCA0ODwz9Uf1RIBD9USAR/VEiDv0MDw8PDw8PDw8PDw8PDw8PDyIP/U79DiEQ/QwAZ5fwn/gIbylOvtm20SFGIA5BBP1t/Q4hDv0MAMNdnkOAHt1enQPAHd5AgyANQQT9bf0O/QwAEAISZHRmdsTUxtagsKKyIA0gD/1O/Q79Uf0MDAwMDAwMDAwMDAwMDAwMDP1RIQ0CQAJAAkACQCADQXpqQQNxDgQDAAECAwsgDSAN/Q0ABQoPBAkOAwgNAgcMAQYLIQ0MAgsgDSAN/Q0ACQILBA0GDwgBCgMMBQ4HIQ0MAQsgDSAN/Q0ADQoHBAEOCwgFAg8MCQYDIQ0LIA4gEP1RIQ4gAkHggAFqIA39CwQAAkACQAJAAkAgBSADakEDcQ4EAwABAgMLIA4gDv0NAAUKDwQJDgMIDQIHDAEGCyEODAILIA4gDv0NAAkCCwQNBg8IAQoDDAUOByEODAELIA4gDv0NAA0KBwQBDgsIBQIPDAkGAyEOCyACQdCCAWogDv0LBAAgAkEQaiECIAUgA0F/aiIDag0AC0EAIQIDQCABQRBqIAJqQgA3AwAgAkEIaiICQfABSQ0ACyABIQJBACEDA0AgAkIANwAAIAQhAiADQQhqIgNBEEkNAAtBACEDC0EAIQJBAEEQNgKghQEDQCACQaCAAWpCADcDACACQQhqIgJBIEkNAAsgAUGAAmokACADCwYAQYCABAsGAEGAiwELBgBBsIQBCwYAQaCAAQsFAEHwBAsGAEHAgAELBQBBwAoLBgBB4IoBC9YSAgd/D3tBACEFAkAgAigCACIGQRBHDQAgA0HAAEkNAEHghAEgAGshB0EAIQUDQEHghAEhCEEAIQkDQAJAAkAgByAJQQR0IgZqQQ9LDQBBACEGA0AgCCAGaiAAIAZqLQAAOgAAIAZBAWoiBkEQRw0ADAILCyAGIAD9AAAA/QsE4IQBC0EBIQpBECEGA0AgBkF/aiIGIABqIgsgCiALLQAAaiIKOgAAIApBCHYhCiAGIARLDQALIAhBEGohCCAJQQFqIglBBEcNAAv9DADDXZ5DgB7dXp0DwB3eQIMiDEEA/QAE0IABIg1BAP0ABJCFAf1RIg5BBP1t/Q79DAAQAhJkdGZ2xNTG1qCworIiDyAO/QwPDw8PDw8PDw8PDw8PDw8PIhD9Tv0O/VEhESAMIA1BAP0ABICFAf1RIg5BBP1t/Q4gDyAOIBD9Tv0O/VEhEiAMIA1BAP0ABPCEAf1RIg5BBP1t/Q4gDyAOIBD9Tv0O/VEhEyAMIA1BAP0ABOCEAf1RIg1BBP1t/Q4gDyANIBD9Tv0O/VEhFAJAQQAoAsCAASILQQJJDQBBASEGQeCAASEKA0AgCv0ABAAhDQJAAkACQAJAIAZBA3EOBAMAAQIDCyANIA39DQAFCg8ECQ4DCA0CBwwBBgshDQwCCyANIA39DQAJAgsEDQYPCAEKAwwFDgchDQwBCyANIA39DQANCgcEAQ4LCAUCDwwJBgMhDQsgDf0MAAvALmiN7uUlTWOjhqhGyyIP/QyAAQkODQsHBg8CDAUKBAMIIgwgDCARIBH9DQAFCg8ECQ4DCA0CBwwBBgsiDkEE/W0iFSAOIBD9TiIW/VEiF/0O/QyADw4FBwMLBAoNCAYMCQIBIg4gFv0OIhj9Uf0OIBX9USIR/Q79DAB6ScE0xojyu49OB7x99TMiFiAMIBggDCAV/Q79Uf0OIBf9USIZ/Q79USIV/QwA5Qsbv0oQ9f5BWlGvtKTuIhcgEf0O/QwA2Yk5zqewaeAuF55+R/dQIhggGf0O/VEiEf1RIhkgGf0NAQIDAAUGBwQJCgsIDQ4PDCAVIBX9DQECAwAFBgcECQoLCA0ODwwgFf1RIhUgFf0NAgMAAQYHBAUKCwgJDg8MDf1RIBH9Uf1RIREgDSAPIAwgDCASIBL9DQAFCg8ECQ4DCA0CBwwBBgsiEkEE/W0iFSASIBD9TiIS/VEiGf0OIA4gEv0OIhL9Uf0OIBX9USIa/Q4gFiAMIBIgDCAV/Q79Uf0OIBn9USIS/Q79USIVIBcgGv0OIBggEv0O/VEiEv1RIhkgGf0NAQIDAAUGBwQJCgsIDQ4PDCAVIBX9DQECAwAFBgcECQoLCA0ODwwgFf1RIhUgFf0NAgMAAQYHBAUKCwgJDg8MDf1RIBL9Uf1RIRIgDSAPIAwgDCATIBP9DQAFCg8ECQ4DCA0CBwwBBgsiE0EE/W0iFSATIBD9TiIT/VEiGf0OIA4gE/0OIhP9Uf0OIBX9USIa/Q4gFiAMIBMgDCAV/Q79Uf0OIBn9USIT/Q79USIVIBcgGv0OIBggE/0O/VEiE/1RIhkgGf0NAQIDAAUGBwQJCgsIDQ4PDCAVIBX9DQECAwAFBgcECQoLCA0ODwwgFf1RIhUgFf0NAgMAAQYHBAUKCwgJDg8MDf1RIBP9Uf1RIRMgDSAPIAwgDCAUIBT9DQAFCg8ECQ4DCA0CBwwBBgsiFEEE/W0iFSAUIBD9TiIU/VEiGf0OIA4gFP0OIg79Uf0OIBX9USIU/Q4gFiAMIA4gDCAV/Q79Uf0OIBn9USIP/Q79USIMIBcgFP0OIBggD/0O/VEiD/1RIg4gDv0NAQIDAAUGBwQJCgsIDQ4PDCAMIAz9DQECAwAFBgcECQoLCA0ODwwgDP1RIgwgDP0NAgMAAQYHBAUKCwgJDg8MDf1RIA/9Uf1RIRQgCkEQaiEKIAsgBkEBaiIGRw0ACwtBACEGQQAgC0EEdP0ABNCAASIN/QwAe7A9Z5GN9kYhHKzq11rLIg/9DIABCQ4NCwcGDwIMBQoEAwgiDCAMIBFBBP1tIhUgESAQ/U4iFv1RIhf9Dv0MgA8OBQcDCwQKDQgGDAkCASIOIBb9DiIY/VH9DiAV/VH9Dv0MAGSZEuUKi+92k4EYbnz3/SIWIAwgDCAV/Q4gGP1R/Q4gF/1R/Q79USIVIBX9DQAFCg8ECQ4DCA0CBwwBBgv9Uf0LBJCFAUEAIA0gDyAMIAwgEkEE/W0iFSASIBD9TiIX/VEiGP0OIA4gF/0OIhf9Uf0OIBX9Uf0OIBYgDCAMIBX9DiAX/VH9DiAY/VH9Dv1RIhUgFf0NAAUKDwQJDgMIDQIHDAEGC/1R/QsEgIUBQQAgDSAPIAwgDCATQQT9bSIVIBMgEP1OIhf9USIY/Q4gDiAX/Q4iF/1R/Q4gFf1R/Q4gFiAMIAwgFf0OIBf9Uf0OIBj9Uf0O/VEiFSAV/Q0ABQoPBAkOAwgNAgcMAQYL/VH9CwTwhAFBACANIA8gDCAMIBRBBP1tIhUgFCAQ/U4iEP1RIhf9DiAOIBD9DiIQ/VH9DiAV/VH9DiAWIAwgDCAV/Q4gEP1R/Q4gF/1R/Q79USIMIAz9DQAFCg8ECQ4DCA0CBwwBBgv9Uf0LBOCEAQNAIAUgBmpBgIsBaiIKIAr9AAQAIAZB4IQBav0ABAD9Uf0LBAAgBkEQaiIGQcAARw0ACyAFQcAAaiEFIAIoAgAiBkEQRw0BIAMgBWtBP0sNAAsLAkAgBSADTw0AIAEgAGtBD0shCQNAAkAgBkEQRw0AAkACQCAJDQBBACEGA0AgASAGaiAAIAZqLQAAOgAAIAZBAWoiBkEQRw0ACyAB/QAAACEMDAELIAEgAP0AAAAiDP0LAAALIAEgDBAA/QsAAEEBIQpBECEGA0AgBkF/aiIGIABqIgsgCiALLQAAaiIKOgAAIApBCHYhCiAGIARLDQALQQAhBiACQQA2AgALAkBBECAGayIKIAMgBWsiCyAKIAtJGyIIRQ0AIAVBgIsBaiEGIAEhCiAIIQsDQCAGIAYtAAAgCiACKAIAai0AAHM6AAAgCkEBaiEKIAZBAWohBiALQX9qIgsNAAsgAigCACEGCyACIAYgCGoiBjYCACAIIAVqIgUgA0kNAAsLQaAEIQYDQCAGQcCAAWpCADcDACAGQeh7aiEKIAZBCGohBiAKQcAASQ0ACwu6AQIDfwJ7QQIhAQJAIABBgIAESw0AIABBD3ENAEEDIQFBACgCwIABIgJBdmoiA0EESw0AIANBAnQoAoCAASEBAkAgAkF1ag4DAQABAAtBACEBQQD9AATAhAEhBEEA/QAEsIQBIQUCQCAARQ0AA0AgAUGAiwFqIQIgAiAFIAL9AAQAIgUgBP1REAH9USIE/QsEACABQRBqIgEgAEkNAAsLQQAhAUEAIAT9CwTAhAFBACAF/QsEsIQBCyABC7oBAgN/AntBAiEBAkAgAEGAgARLDQAgAEEPcQ0AQQMhAUEAKALAgAEiAkF2aiIDQQRLDQAgA0ECdCgCgIABIQECQCACQXVqDgMBAAEAC0EAIQFBAP0ABMCEASEEQQD9AASwhAEhBQJAIABFDQADQCABQYCLAWohAiACIAQgAv0ABAAiBCAF/VEQAP1RIgX9CwQAIAFBEGoiASAASQ0ACwtBACEBQQAgBP0LBMCEAUEAIAX9CwSwhAELIAEL1zcHBn8CewF/An4VewF/An5BAiEBAkAgAEGAgARLDQAgAEEPcQ0AAkBBACgCwIABIgJBdmoiA0EETQ0AQQMPCyADQQJ0KAKAgAEhAQJAIAJBdWoOAwEAAQALQQAhAwJAIABBwABJDQAgAkF/aiEEIAJBBHQiA0GAggFqIQUgA0HAggFqIQZBAP0ABMCCASEHQQD9AATQggEhCCACQQxGIQlBACEDA0AgAykDuIsBIQogAykDsIsBIQtBACECA0AgAkHghAFqIAMgAmpBgIsBav0ABAD9CwQAIAJBEGoiAkHAAEcNAAv9DABnl/Cf+AhvKU6+2bbRIUYiDCAG/QAEACINQQD9AASQhQH9USIOQQT9bf0O/Qx08Y0I/XgEgfZzD4p/+oYDIg8gDv0MDw8PDw8PDw8PDw8PDw8PDyIQ/U79Dv1RIREgDCANQQD9AASAhQH9USIOQQT9bf0OIA8gDiAQ/U79Dv1RIRIgDCANQQD9AATwhAH9USIOQQT9bf0OIA8gDiAQ/U79Dv1RIRMgDCANQQD9AATghAH9USINQQT9bf0OIA8gDSAQ/U79Dv1RIRQCQAJAIARBBE8NACAEIQEMAQsgBSECIAQhAQNAIAL9AAQAIhX9DAC6RRYy21PprJ6IzWF3JP8iD/0MgAEJDg0LBwYPAgwFCgQDCCIMIAz9DABIpg7UNKjgRpKcOnxy2u4iDSAMIAwgDSAMIAwgDSAMIAwgEUEE/W0iFv0O/QyADw4FBwMLBAoNCAYMCQIBIg4gESAQ/U4iF/0OIhj9Uf0OIBYgF/1RIhf9USIZ/Q4gDyAMIAwgF/0OIBj9Uf0OIBb9USIa/Q79Uf0MACT/uncWRWGe6VOsMojN2yIWIBr9Dv0MANruSHIOpnyS4KhG1Jw6NCIXIBn9Dv1RIhggGP0NDQ4PDAECAwAFBgcECQoLCP1R/QwA7Ch4DbFQvJSZ4cldJXXEIhggGv0O/QwA635AYLU+1avLi/VeHiCVIhsgGf0O/VEiHCAc/Q0HBAUGCwgJCg8MDQ4DAAEC/VEgDSAa/Q79DADGf/YGSYlPMDbAv4958LkiGiAZ/Q79USIZIBn9DQoLCAkODwwNAgMAAQYHBAX9USACQTBq/QAEACIZ/VEiHEEE/W0iHf0OIA4gHCAQ/U4iHP0OIh79Uf0OIB0gHP1RIh/9USIc/Q4gDyAMIAwgH/0OIB79Uf0OIB39USId/Q79USAWIB39DiAXIBz9Dv1RIh4gHv0NCQoLCA0ODwwBAgMABQYHBP1RIBggHf0OIBsgHP0O/VEiHiAe/Q0LCAkKDwwNDgMAAQIHBAUG/VEgDSAd/Q4gGiAc/Q79USIcIBz9DQIDAAEGBwQFCgsICQ4PDA39USACQSBq/QAEACIc/VEiHUEE/W0iHv0OIA4gHSAQ/U4iHf0OIh/9Uf0OIB4gHf1RIhH9USId/Q4gDyAMIAwgEf0OIB/9Uf0OIB79USIe/Q79USAWIB79DiAXIB39Dv1RIh8gH/0NBQYHBAkKCwgNDg8MAQIDAP1RIBggHv0OIBsgHf0O/VEiHyAf/Q0PDA0OAwABAgcEBQYLCAkK/VEgDSAe/Q4gGiAd/Q79USIdIB39DQoLCAkODwwNAgMAAQYHBAX9USACQRBq/QAEACId/VEiHkEE/W0iHyAeIBD9TiIe/VEiEf0OIA4gHv0OIiD9Uf0OIB/9USIe/Q4gDSAMIAwgH/0OICD9Uf0OIBH9USIf/Q79USAWIB79DiAXIB/9Dv1RIhEgEf0NAQIDAAUGBwQJCgsIDQ4PDP1RIBggHv0OIBsgH/0O/VEiESAR/Q0DAAECBwQFBgsICQoPDA0O/VEgDSAe/Q4gGiAf/Q79USIeIB79DQIDAAEGBwQFCgsICQ4PDA39Uf1RIREgFSAPIAwgDCANIAwgDCANIAwgDCANIAwgDCASQQT9bSIf/Q4gDiASIBD9TiIe/Q4iEv1R/Q4gHyAe/VEiIP1RIh79DiAPIAwgDCAg/Q4gEv1R/Q4gH/1RIh/9Dv1RIBYgH/0OIBcgHv0O/VEiEiAS/Q0NDg8MAQIDAAUGBwQJCgsI/VEgGCAf/Q4gGyAe/Q79USISIBL9DQcEBQYLCAkKDwwNDgMAAQL9USANIB/9DiAaIB79Dv1RIh4gHv0NCgsICQ4PDA0CAwABBgcEBf1RIBn9USIeQQT9bSIf/Q4gDiAeIBD9TiIe/Q4iEv1R/Q4gHyAe/VEiIP1RIh79DiAPIAwgDCAg/Q4gEv1R/Q4gH/1RIh/9Dv1RIBYgH/0OIBcgHv0O/VEiEiAS/Q0JCgsIDQ4PDAECAwAFBgcE/VEgGCAf/Q4gGyAe/Q79USISIBL9DQsICQoPDA0OAwABAgcEBQb9USANIB/9DiAaIB79Dv1RIh4gHv0NAgMAAQYHBAUKCwgJDg8MDf1RIBz9USIeQQT9bSIf/Q4gDiAeIBD9TiIe/Q4iEv1R/Q4gHyAe/VEiIP1RIh79DiAPIAwgDCAg/Q4gEv1R/Q4gH/1RIh/9Dv1RIBYgH/0OIBcgHv0O/VEiEiAS/Q0FBgcECQoLCA0ODwwBAgMA/VEgGCAf/Q4gGyAe/Q79USISIBL9DQ8MDQ4DAAECBwQFBgsICQr9USANIB/9DiAaIB79Dv1RIh4gHv0NCgsICQ4PDA0CAwABBgcEBf1RIB39USIeQQT9bSIfIB4gEP1OIh79USIS/Q4gDiAe/Q4iIP1R/Q4gH/1RIh79DiANIAwgDCAf/Q4gIP1R/Q4gEv1RIh/9Dv1RIBYgHv0OIBcgH/0O/VEiEiAS/Q0BAgMABQYHBAkKCwgNDg8M/VEgGCAe/Q4gGyAf/Q79USISIBL9DQMAAQIHBAUGCwgJCg8MDQ79USANIB79DiAaIB/9Dv1RIh4gHv0NAgMAAQYHBAUKCwgJDg8MDf1R/VEhEiAVIA8gDCAMIA0gDCAMIA0gDCAMIA0gDCAMIBNBBP1tIh/9DiAOIBMgEP1OIh79DiIT/VH9DiAfIB79USIg/VEiHv0OIA8gDCAMICD9DiAT/VH9DiAf/VEiH/0O/VEgFiAf/Q4gFyAe/Q79USITIBP9DQ0ODwwBAgMABQYHBAkKCwj9USAYIB/9DiAbIB79Dv1RIhMgE/0NBwQFBgsICQoPDA0OAwABAv1RIA0gH/0OIBogHv0O/VEiHiAe/Q0KCwgJDg8MDQIDAAEGBwQF/VEgGf1RIh5BBP1tIh/9DiAOIB4gEP1OIh79DiIT/VH9DiAfIB79USIg/VEiHv0OIA8gDCAMICD9DiAT/VH9DiAf/VEiH/0O/VEgFiAf/Q4gFyAe/Q79USITIBP9DQkKCwgNDg8MAQIDAAUGBwT9USAYIB/9DiAbIB79Dv1RIhMgE/0NCwgJCg8MDQ4DAAECBwQFBv1RIA0gH/0OIBogHv0O/VEiHiAe/Q0CAwABBgcEBQoLCAkODwwN/VEgHP1RIh5BBP1tIh/9DiAOIB4gEP1OIh79DiIT/VH9DiAfIB79USIg/VEiHv0OIA8gDCAMICD9DiAT/VH9DiAf/VEiH/0O/VEgFiAf/Q4gFyAe/Q79USITIBP9DQUGBwQJCgsIDQ4PDAECAwD9USAYIB/9DiAbIB79Dv1RIhMgE/0NDwwNDgMAAQIHBAUGCwgJCv1RIA0gH/0OIBogHv0O/VEiHiAe/Q0KCwgJDg8MDQIDAAEGBwQF/VEgHf1RIh5BBP1tIh8gHiAQ/U4iHv1RIhP9DiAOIB79DiIg/VH9DiAf/VEiHv0OIA0gDCAMIB/9DiAg/VH9DiAT/VEiH/0O/VEgFiAe/Q4gFyAf/Q79USITIBP9DQECAwAFBgcECQoLCA0ODwz9USAYIB79DiAbIB/9Dv1RIhMgE/0NAwABAgcEBQYLCAkKDwwNDv1RIA0gHv0OIBogH/0O/VEiHiAe/Q0CAwABBgcEBQoLCAkODwwN/VH9USETIBUgDyAMIAwgDSAMIAwgDSAMIAwgDSAMIAwgFEEE/W0iH/0OIA4gFCAQ/U4iHv0OIhT9Uf0OIB8gHv1RIiD9USIe/Q4gDyAMIAwgIP0OIBT9Uf0OIB/9USIf/Q79USAWIB/9DiAXIB79Dv1RIhQgFP0NDQ4PDAECAwAFBgcECQoLCP1RIBggH/0OIBsgHv0O/VEiFCAU/Q0HBAUGCwgJCg8MDQ4DAAEC/VEgDSAf/Q4gGiAe/Q79USIeIB79DQoLCAkODwwNAgMAAQYHBAX9USAZ/VEiGUEE/W0iHv0OIA4gGSAQ/U4iGf0OIh/9Uf0OIB4gGf1RIhT9USIZ/Q4gDyAMIAwgFP0OIB/9Uf0OIB79USIe/Q79USAWIB79DiAXIBn9Dv1RIh8gH/0NCQoLCA0ODwwBAgMABQYHBP1RIBggHv0OIBsgGf0O/VEiHyAf/Q0LCAkKDwwNDgMAAQIHBAUG/VEgDSAe/Q4gGiAZ/Q79USIZIBn9DQIDAAEGBwQFCgsICQ4PDA39USAc/VEiGUEE/W0iHP0OIA4gGSAQ/U4iGf0OIh79Uf0OIBwgGf1RIh/9USIZ/Q4gDyAMIAwgH/0OIB79Uf0OIBz9USIc/Q79USAWIBz9DiAXIBn9Dv1RIh4gHv0NBQYHBAkKCwgNDg8MAQIDAP1RIBggHP0OIBsgGf0O/VEiHiAe/Q0PDA0OAwABAgcEBQYLCAkK/VEgDSAc/Q4gGiAZ/Q79USIZIBn9DQoLCAkODwwNAgMAAQYHBAX9USAd/VEiHEEE/W0iGSAcIBD9TiIc/VEiHf0OIA4gHP0OIhz9Uf0OIBn9USIO/Q4gDSAMIAwgGf0OIBz9Uf0OIB39USIM/Q79USAWIA79DiAXIAz9Dv1RIg8gD/0NAQIDAAUGBwQJCgsIDQ4PDP1RIBggDv0OIBsgDP0O/VEiDyAP/Q0DAAECBwQFBgsICQoPDA0O/VEgDSAO/Q4gGiAM/Q79USIMIAz9DQIDAAEGBwQFCgsICQ4PDA39Uf1RIRQgAkFAaiECIAFBfGoiAUEDSw0ACwsCQCABRQ0AIAFBBHT9AATAggEiFf0MALpFFjLbU+msnojNYXck/yIP/QyAAQkODQsHBg8CDAUKBAMIIgwgDCARQQT9bSIWIBEgEP1OIg39USIX/Q79DIAPDgUHAwsECg0IBgwJAgEiDiAN/Q4iGP1R/Q4gFv1RIhr9Dv0MAEimDtQ0qOBGkpw6fHLa7iINIAwgDCAW/Q4gGP1R/Q4gF/1RIhn9Dv1R/QwAJP+6dxZFYZ7pU6wyiM3bIhYgGv0O/QwA2u5Icg6mfJLgqEbUnDo0IhcgGf0O/VEiGCAY/Q0NDg8MAQIDAAUGBwQJCgsI/VH9DADsKHgNsVC8lJnhyV0ldcQiGCAa/Q79DADrfkBgtT7Vq8uL9V4eIJUiGyAZ/Q79USIcIBz9DQcEBQYLCAkKDwwNDgMAAQL9USANIBr9Dv0MAMZ/9gZJiU8wNsC/j3nwuSIaIBn9Dv1RIhkgGf0NCgsICQ4PDA0CAwABBgcEBf1R/VEhESAVIA8gDCAMIBJBBP1tIhwgEiAQ/U4iGf1RIh39DiAOIBn9DiIe/VH9DiAc/VEiGf0OIA0gDCAMIBz9DiAe/VH9DiAd/VEiHP0O/VEgFiAZ/Q4gFyAc/Q79USIdIB39DQ0ODwwBAgMABQYHBAkKCwj9USAYIBn9DiAbIBz9Dv1RIh0gHf0NBwQFBgsICQoPDA0OAwABAv1RIA0gGf0OIBogHP0O/VEiGSAZ/Q0KCwgJDg8MDQIDAAEGBwQF/VH9USESIBUgDyAMIAwgE0EE/W0iHCATIBD9TiIZ/VEiHf0OIA4gGf0OIh79Uf0OIBz9USIZ/Q4gDSAMIAwgHP0OIB79Uf0OIB39USIc/Q79USAWIBn9DiAXIBz9Dv1RIh0gHf0NDQ4PDAECAwAFBgcECQoLCP1RIBggGf0OIBsgHP0O/VEiHSAd/Q0HBAUGCwgJCg8MDQ4DAAEC/VEgDSAZ/Q4gGiAc/Q79USIZIBn9DQoLCAkODwwNAgMAAQYHBAX9Uf1RIRMgFSAPIAwgDCAUQQT9bSIcIBQgEP1OIhn9USId/Q4gDiAZ/Q4iHv1R/Q4gHP1RIhn9DiANIAwgDCAc/Q4gHv1R/Q4gHf1RIhz9Dv1RIBYgGf0OIBcgHP0O/VEiHSAd/Q0NDg8MAQIDAAUGBwQJCgsI/VEgGCAZ/Q4gGyAc/Q79USIdIB39DQcEBQYLCAkKDwwNDgMAAQL9USANIBn9DiAaIBz9Dv1RIhkgGf0NCgsICQ4PDA0CAwABBgcEBf1R/VEhFCABQX9qIgJFDQAgAkEEdP0ABMCCASIVIA8gDCAMIBFBBP1tIhwgESAQ/U4iGf1RIh39DiAOIBn9DiIe/VH9DiAc/VEiGf0OIA0gDCAMIBz9DiAe/VH9DiAd/VEiHP0O/VEgFiAZ/Q4gFyAc/Q79USIdIB39DQkKCwgNDg8MAQIDAAUGBwT9USAYIBn9DiAbIBz9Dv1RIh0gHf0NCwgJCg8MDQ4DAAECBwQFBv1RIA0gGf0OIBogHP0O/VEiGSAZ/Q0CAwABBgcEBQoLCAkODwwN/VH9USERIBUgDyAMIAwgEkEE/W0iHCASIBD9TiIZ/VEiHf0OIA4gGf0OIh79Uf0OIBz9USIZ/Q4gDSAMIAwgHP0OIB79Uf0OIB39USIc/Q79USAWIBn9DiAXIBz9Dv1RIh0gHf0NCQoLCA0ODwwBAgMABQYHBP1RIBggGf0OIBsgHP0O/VEiHSAd/Q0LCAkKDwwNDgMAAQIHBAUG/VEgDSAZ/Q4gGiAc/Q79USIZIBn9DQIDAAEGBwQFCgsICQ4PDA39Uf1RIRIgFSAPIAwgDCATQQT9bSIcIBMgEP1OIhn9USId/Q4gDiAZ/Q4iHv1R/Q4gHP1RIhn9DiANIAwgDCAc/Q4gHv1R/Q4gHf1RIhz9Dv1RIBYgGf0OIBcgHP0O/VEiHSAd/Q0JCgsIDQ4PDAECAwAFBgcE/VEgGCAZ/Q4gGyAc/Q79USIdIB39DQsICQoPDA0OAwABAgcEBQb9USANIBn9DiAaIBz9Dv1RIhkgGf0NAgMAAQYHBAUKCwgJDg8MDf1R/VEhEyAVIA8gDCAMIBRBBP1tIhwgFCAQ/U4iGf1RIh39DiAOIBn9DiIe/VH9DiAc/VEiGf0OIA0gDCAMIBz9DiAe/VH9DiAd/VEiHP0O/VEgFiAZ/Q4gFyAc/Q79USIdIB39DQkKCwgNDg8MAQIDAAUGBwT9USAYIBn9DiAbIBz9Dv1RIh0gHf0NCwgJCg8MDQ4DAAECBwQFBv1RIA0gGf0OIBogHP0O/VEiGSAZ/Q0CAwABBgcEBQoLCAkODwwN/VH9USEUIAJBAUYNACAIIA8gDCAMIBFBBP1tIhkgESAQ/U4iFf1RIhz9DiAOIBX9DiId/VH9DiAZ/VEiFf0OIA0gDCAMIBn9DiAd/VH9DiAc/VEiGf0O/VEgFiAV/Q4gFyAZ/Q79USIcIBz9DQUGBwQJCgsIDQ4PDAECAwD9USAYIBX9DiAbIBn9Dv1RIhwgHP0NDwwNDgMAAQIHBAUGCwgJCv1RIA0gFf0OIBogGf0O/VEiFSAV/Q0KCwgJDg8MDQIDAAEGBwQF/VH9USERIAggDyAMIAwgEkEE/W0iGSASIBD9TiIV/VEiHP0OIA4gFf0OIh39Uf0OIBn9USIV/Q4gDSAMIAwgGf0OIB39Uf0OIBz9USIZ/Q79USAWIBX9DiAXIBn9Dv1RIhwgHP0NBQYHBAkKCwgNDg8MAQIDAP1RIBggFf0OIBsgGf0O/VEiHCAc/Q0PDA0OAwABAgcEBQYLCAkK/VEgDSAV/Q4gGiAZ/Q79USIVIBX9DQoLCAkODwwNAgMAAQYHBAX9Uf1RIRIgCCAPIAwgDCATQQT9bSIZIBMgEP1OIhX9USIc/Q4gDiAV/Q4iHf1R/Q4gGf1RIhX9DiANIAwgDCAZ/Q4gHf1R/Q4gHP1RIhn9Dv1RIBYgFf0OIBcgGf0O/VEiHCAc/Q0FBgcECQoLCA0ODwwBAgMA/VEgGCAV/Q4gGyAZ/Q79USIcIBz9DQ8MDQ4DAAECBwQFBgsICQr9USANIBX9DiAaIBn9Dv1RIhUgFf0NCgsICQ4PDA0CAwABBgcEBf1R/VEhEyAIIA8gDCAMIBRBBP1tIhUgFCAQ/U4iGf1RIhz9DiAOIBn9DiIZ/VH9DiAV/VEiDv0OIA0gDCAMIBX9DiAZ/VH9DiAc/VEiDP0O/VEgFiAO/Q4gFyAM/Q79USIPIA/9DQUGBwQJCgsIDQ4PDAECAwD9USAYIA79DiAbIAz9Dv1RIg8gD/0NDwwNDgMAAQIHBAUGCwgJCv1RIA0gDv0OIBogDP0O/VEiDCAM/Q0KCwgJDg8MDQIDAAEGBwQF/VH9USEUC0EAIAf9DADzyNwsyxTnLwPfFzjk8DsiDf0MgAEJDg0LBwYPAgwFCgQDCCIMIAwgEUEE/W0iFiARIBD9TiIO/VEiF/0O/QyADw4FBwMLBAoNCAYMCQIBIg8gDv0OIhj9Uf0OIBb9Uf0O/QwA8pkwncapW8Jfb/Y0BK1rIg4gDCAMIBb9DiAY/VH9DiAX/VH9Dv1RIhYgFiAW/Q0ACQILBA0GDwgBCgMMBQ4HIAkb/VH9CwSQhQFBACAHIA0gDCAMIBJBBP1tIhYgEiAQ/U4iF/1RIhj9DiAPIBf9DiIX/VH9DiAW/VH9DiAOIAwgDCAW/Q4gF/1R/Q4gGP1R/Q79USIWIBYgFv0NAAkCCwQNBg8IAQoDDAUOByAJG/1R/QsEgIUBQQAgByANIAwgDCATQQT9bSIWIBMgEP1OIhf9USIY/Q4gDyAX/Q4iF/1R/Q4gFv1R/Q4gDiAMIAwgFv0OIBf9Uf0OIBj9Uf0O/VEiFiAWIBb9DQAJAgsEDQYPCAEKAwwFDgcgCRv9Uf0LBPCEAUEAIAcgDSAMIAwgFEEE/W0iFiAUIBD9TiIQ/VEiF/0OIA8gEP0OIhD9Uf0OIBb9Uf0OIA4gDCAMIBb9DiAQ/VH9DiAX/VH9Dv1RIgwgDCAM/Q0ACQILBA0GDwgBCgMMBQ4HIAkb/VEiDP0LBOCEAUEJIQFB2AQhAgNAIAMgAmoiIUHghgFqICFB0IYBaikDACACQcCAAWopAwCFNwMAIAJBeGohAiABQX9qIgFBA0oNAAtBACkDuIQBISJBACAKNwO4hAFBACkDsIQBIQpBACALNwOwhAEgA0GAiwFqIAogDP0dAIU3AwAgA0GIiwFqICIgDP0dAYU3AwAgACADQcAAaiIDa0E/Sw0ACwtBeCECA0AgAkHohAFqQgA3AwAgAkEIaiICQTFJDQALQQAhASADIABPDQBBACkDuIQBIQtBACkDsIQBISIDQCADQYCLAWoiAikAACEKIAL9AAAAEAEhDEEAIANBiIsBaiIhKQAAIiM3A7iEAUEAIAo3A7CEASAhIAz9HQEgC4U3AAAgAiAiIAz9HQCFNwAAICMhCyAKISIgA0EQaiIDIABJDQALCyABC6ABAgN/AXtBAiEBAkAgAEGAgARLDQAgAEEPcQ0AQQMhAUEAKALAgAEiAkF2aiIDQQRLDQAgA0ECdCgCgIABIQECQCACQXVqDgMBAAEAC0EAIQFBAP0ABLCEASEEAkAgAEUNAANAIAFBgIsBaiECIAIgAv0ABAAgBP1REAAiBP0LBAAgAUEQaiIBIABJDQALC0EAIQFBACAE/QsEsIQBCyABC2EBAn8CQCAAQYCABE0NAEECDwsCQEEAKALAgAEiAUF2aiICQQRNDQBBAw8LIAJBAnQoAoCAASECAkACQCABQXVqDgMBAAEAC0EAIQJBsIQBQdCEAUGghQEgAEEAEAsLIAILkQECA38CfgJAIABBgIAETQ0AQQIPC0EDIQECQEEAKALAgAEiAkF2aiIDQQRLDQAgA0ECdCgCgIABIQECQCACQXVqDgMBAAEAC0EDIQFBACgC+IoBQQJHDQACQEL//////////x9BACkDkIoBIgR9IACtIgVaDQBBAg8LQQAhAUEAIAQgBXw3A5CKASAAEBILIAELkQIBBH8CQCAARQ0AQQAoAvCKASEBQQAhAgNAAkACQCAAIAJrIgNBEEkNACABDQAgAikAgIsBIAJBiIsBaikAABAUIAJBEGohAkEAKALwigEhAQwBCwJAQRAgAWsiBCADIAQgA0kbIgRFDQAgAkGAiwFqIQFBACEDA0AgA0EAKALwigFqQcCKAWogASADai0AADoAACAEIANBAWoiA0cNAAtBACgC8IoBIQELQQAgASAEaiIBNgLwigEgBCACaiECIAFBEEcNAEEAIQFBACkDwIoBQQApA8iKARAUQQBBADYC8IoBQQAhA0EAIQQDQCAEQgA3A8CKAUEIIQQgA0EIaiIDQQ9NDQALCyACIABJDQALCwv5AQIDfwJ+AkAgAEGAgARNDQBBAg8LQQMhAQJAQQAoAsCAASICQXZqIgNBBEsNACADQQJ0KAKAgAEhAQJAIAJBdWoOAwEAAQALQQMhAUEAKAL4igEiAkF+cUECRw0AAkBC4P////8BQQApA5iKASIEfSAArSIFWg0AQQIPCwJAIAJBAkcNAEEAIQECQEEAKALwigFFDQBBACkDwIoBQQApA8iKARAUQQBBADYC8IoBQQAhAgNAIAJCADcDwIoBQQghAiABQQhqIgFBEEkNAAtBACkDmIoBIQQLQQBBAzYC+IoBC0EAIQFBACAEIAV8NwOYigEgABASCyABC64QCQF7AX8DewJ+AXsBfwF+AX8GfkEAQQD9AATghwEiAkEAKQOAigEgAUIBiELVqtWq1arVqtUAgyABQgGGQqrVqtWq1arVqn+DhCIBQgKIQrPmzJmz5syZM4MgAUIChkLMmbPmzJmz5kyDhCIBQgSIQo+evPjw4cOHD4MgAUIEhkLw4cOHj568+HCDhIUiAUIgiKciA/0R/QwRERERIiIiIkRERESIiIiIIgT9TiIF/d4BIAIgBf3fAf1RIgIgAv0NCAkKCwwNDg8AAQIDBAUGB0EA/QAEwIcBIgIgBf3eASACIAX93wH9Uf1R/QwiIiIiIiIiIoiIiIiIiIiIIgL9TkEA/QAE0IcBIgYgBf3eASAGIAX93wH9USIGIAb9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABLCHASIGIAX93gEgBiAF/d8B/VH9Uf0MERERERERERFERERERERERCIF/U79UCIG/R0BIgdCP4ggB0I+iIUgBv0dACAHhCIHQjmIhSIIQgGGIAhCAoaFIAhCB4aFQQD9AATghQEiCUEAKQP4iQEgAEIBiELVqtWq1arVqtUAgyAAQgGGQqrVqtWq1arVqn+DhCIAQgKIQrPmzJmz5syZM4MgAEIChkLMmbPmzJmz5kyDhCIAQgSIQo+evPjw4cOHD4MgAEIEhkLw4cOHj568+HCDhIUiAKciCv0RIAT9TiIG/d4BIAkgBv3fAf1RIgkgCf0NCAkKCwwNDg8AAQIDBAUGByAGQQD9AATAhQEiCf3eASAGIAn93wH9Uf1RIAL9TiAGQQD9AATQhQEiCf3eASAGIAn93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgcgBkEA/QAEsIUBIgn93gEgBiAJ/d8B/VH9USAF/U79UCIG/R0AIAb9HQGEIgtBAP0ABOCGASIJIABCIIinIgwgCnP9ESAE/U4iBv3eASAJIAb93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABMCGASIJIAb93gEgCSAG/d8B/VH9USAC/U5BAP0ABNCGASIJIAb93gEgCSAG/d8B/VEiCSAJ/Q0ICQoLDA0ODwABAgMEBQYHQQD9AASwhgEiCSAG/d4BIAkgBv3fAf1R/VEgBf1O/VAiBv0dACAG/R0BhIVBAP0ABKCGASIJIAz9ESAE/U4iBv3eASAJIAb93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABICGASIJIAb93gEgCSAG/d8B/VH9USAC/U5BAP0ABJCGASIJIAb93gEgCSAG/d8B/VEiCSAJ/Q0ICQoLDA0ODwABAgMEBQYHQQD9AATwhQEiCSAG/d4BIAkgBv3fAf1R/VEgBf1O/VAiBv0dACAG/R0BhCINhSIOQQD9AATgiAEiCSABIACFIgCnIgr9ESAE/U4iBv3eASAJIAb93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABMCIASIJIAb93gEgCSAG/d8B/VH9USAC/U5BAP0ABNCIASIJIAb93gEgCSAG/d8B/VEiCSAJ/Q0ICQoLDA0ODwABAgMEBQYHQQD9AASwiAEiCSAG/d4BIAkgBv3fAf1R/VEgBf1O/VAiBv0dACAG/R0BhCIPQQD9AATgiQEiCSAAQiCIpyIMIApz/REgBP1OIgb93gEgCSAG/d8B/VEiCSAJ/Q0ICQoLDA0ODwABAgMEBQYHQQD9AATAiQEiCSAG/d4BIAkgBv3fAf1R/VEgAv1OQQD9AATQiQEiCSAG/d4BIAkgBv3fAf1RIgkgCf0NCAkKCwwNDg8AAQIDBAUGB0EA/QAEsIkBIgkgBv3eASAJIAb93wH9Uf1RIAX9Tv1QIgb9HQAgBv0dAYSFQQD9AASgiQEiCSAM/REgBP1OIgb93gEgCSAG/d8B/VEiCSAJ/Q0ICQoLDA0ODwABAgMEBQYHQQD9AASAiQEiCSAG/d4BIAkgBv3fAf1R/VEgAv1OQQD9AASQiQEiCSAG/d4BIAkgBv3fAf1RIgkgCf0NCAkKCwwNDg8AAQIDBAUGB0EA/QAE8IgBIgkgBv3eASAJIAb93wH9Uf1RIAX9Tv1QIgb9HQAgBv0dAYQiEIUiEUEA/QAEoIcBIgkgAaciCv0RIAT9TiIG/d4BIAkgBv3fAf1RIgkgCf0NCAkKCwwNDg8AAQIDBAUGB0EA/QAEgIcBIgkgBv3eASAJIAb93wH9Uf1RIAL9TkEA/QAEkIcBIgkgBv3eASAJIAb93wH9USIJIAn9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABPCGASIJIAb93gEgCSAG/d8B/VH9USAF/U79UCIG/R0AIAb9HQGEIgFBAP0ABKCIASIGIAMgCnP9ESAE/U4iBP3eASAGIAT93wH9USIGIAb9DQgJCgsMDQ4PAAECAwQFBgdBAP0ABICIASIGIAT93gEgBiAE/d8B/VH9USAC/U5BAP0ABJCIASICIAT93gEgAiAE/d8B/VEiAiAC/Q0ICQoLDA0ODwABAgMEBQYHQQD9AATwhwEiAiAE/d4BIAIgBP3fAf1R/VEgBf1O/VAiBP0dACAE/R0BhIUgB4UiAIWFQiCIIA2FIABCIIYgAYUiEoUgB4UgEIUiAUIChoUgAUIBhoUgAUIHhoUgDkIghiALhSILhSAIhSABhTcD+IkBQQAgEUIghiAOQiCIhCABQj6IhSABQjmIhSABQj+IIABCIIggB4UiAUIBhiABQgKGhSABQgeGhYSFIA2FIBKFIAuFIA+FIAGFNwOAigELxwICAn8BewJAQQAoAsCAAUF2aiIBQQRNDQBBAw8LIAFBAUYgAUEDRnIhAgJAAkAgAEEBSw0AIAJFDQELIAFBAnQoAoCAAUECIAIbDwtBACEBAkBBACgC8IkBDQBBAw8LA0AgAUH4iQFqQgA3AwAgAUEIaiIBQYgBSQ0AC0EAIQFBAEEBNgL4igECQCAARQ0AQXQhAQNAIAFBrIoBaiABQbyEAWotAAA6AAAgAUEBaiIBDQALQQEhAEEAQQE6AK+KAUEAQQD9AASgigEiA/0LBLCKAUEAIAMQAP0LBLCKAUHvCSEBA0AgAUHAgAFqIgIgACACLQAAaiIAOgAAIABBCHYhACABQaF2aiECIAFBf2ohASACQQ1KDQALQQAhAUEA/QwAAAAAAAAAAAAAAAAAAAAA/QsD+IkBQQBCkICAgCA3AvSKAQsgAQuUAQIDfwJ+AkAgAEGAgARNDQBBAg8LQQMhAQJAQQAoAsCAASICQXZqIgNBBEsNACADQQJ0KAKAgAEhAQJAIAJBdWoOAwEAAQALQQMhAUEAKAL4igFBBUcNAAJAQQApA5iKASIEIACtIgVaDQBBAg8LQQAhAUEAIAQgBX03A5iKAUGgigFB0IoBQfSKASAAQQwQCwsgAQuLAgIDfwJ+AkAgAEGAgARNDQBBAg8LQQMhAQJAQQAoAsCAASICQXZqIgNBBEsNACADQQJ0KAKAgAEhAQJAIAJBdWoOAwEAAQALQQMhAUEAKAL4igEiAkF+cUECRw0AAkBC4P////8BQQApA5iKASIEfSAArSIFWg0AQQIPCwJAIAJBAkcNAEEAIQECQEEAKALwigFFDQBBACkDwIoBQQApA8iKARAUQQBBADYC8IoBQQAhAgNAIAJCADcDwIoBQQghAiABQQhqIgFBEEkNAAtBACkDmIoBIQQLQQBBAzYC+IoBC0EAIQFBACAEIAV8NwOYigFBoIoBQdCKAUH0igEgAEEMEAsgABASCyABC5EBAgN/An4CQCAAQYCABE0NAEECDwtBAyEBAkBBACgCwIABIgJBdmoiA0EESw0AIANBAnQoAoCAASEBAkAgAkF1ag4DAQABAAtBAyEBQQAoAviKAUEBRw0AAkBC//////////8fQQApA4iKASIEfSAArSIFWg0AQQIPC0EAIQFBACAEIAV8NwOIigEgABASCyABC4YFBQF/AX4BfwF7AX9BAyEAAkBBACgC+IoBQQFHDQBBACkDiIoBIgFQDQBBACEAAkBBACgC8IoBRQ0AQQApA8CKAUEAKQPIigEQFEEAQQA2AvCKAUEAIQIDQCACQgA3A8CKAUEIIQIgAEEIaiIAQRBJDQALQQApA4iKASEBC0EAIQBBACABQjuGIAFCK4ZCgICAgICAwP8Ag4QgAUIbhkKAgICAgOA/gyABQguGQoCAgIDwH4OEhCABQgWIQoCAgPgPgyABQhWIQoCA/AeDhCABQiWIQoD+A4MgAUIDhkI4iISEhCIBNwPIigFBACkDwIoBIAEQFEEAIQIDQCACQgA3A8CKAUEIIQIgAEEIaiIAQRBJDQALQQBBACkD+IkBIgFCAYhC1arVqtWq1arVAIMgAUIBhkKq1arVqtWq1ap/g4QiAUICiEKz5syZs+bMmTODIAFCAoZCzJmz5syZs+ZMg4QiAUIEiEKPnrz48OHDhw+DIAFCBIZC8OHDh4+evPhwg4Q3A6CKAUEAQQApA4CKASIBQgGIQtWq1arVqtWq1QCDIAFCAYZCqtWq1arVqtWqf4OEIgFCAohCs+bMmbPmzJkzgyABQgKGQsyZs+bMmbPmTIOEIgFCBIhCj568+PDhw4cPgyABQgSGQvDhw4ePnrz4cIOENwOoigFBAEEA/QAEoIoBIgP9CwSwigFBACADEAD9CwSwigFBASECQe8JIQADQCAAQcCAAWoiBCACIAQtAABqIgI6AAAgAkEIdiECIABBoXZqIQQgAEF/aiEAIARBDUoNAAtBACEAQQD9DAAAAAAAAAAAAAAAAAAAAAD9CwP4iQFBAEKQgICAIDcC9IoBCyAAC4wHBAR/AXsCfgV/IwBBMGsiACQAQQMhAQJAQQAoAsCAASICQXZqIgNBBEsNACADQQJ0KAKAgAEhAQJAIAJBdWoOAwEAAQALIAD9DAAAAAAAAAAAAAAAAAAAAAAQACIE/R0AIgVCAYhC1arVqtWq1arVAIMgBUIBhkKq1arVqtWq1ap/g4QiBUICiEKz5syZs+bMmTODIAVCAoZCzJmz5syZs+ZMg4QiBUIEiEKPnrz48OHDhw+DIAVCBIZC8OHDh4+evPhwg4QiBTcDECAAIAT9HQEiBkIBiELVqtWq1arVqtUAgyAGQgGGQqrVqtWq1arVqn+DhCIGQgKIQrPmzJmz5syZM4MgBkIChkLMmbPmzJmz5kyDhCIGQgSIQo+evPjw4cOHD4MgBkIEhkLw4cOHj568+HCDhCIGNwMYIAAgBiAFhTcDIEHAeyEBIABBEGohBwNAIAFBoIoBaiAHKQMAIgWnIgJBiJGixHhxIgP9ESACQZGixIgBcSII/RwBIAJBosSIkQJxIgn9HAIgAkHEiJGiBHEiCv0cA/0LBAAgAUGQigFqIAr9ESAD/RwBIAj9HAIgCf0cA/0LBAAgAUGAigFqIAn9ESAK/RwBIAP9HAIgCP0cA/0LBAAgAUHwiQFqIAj9ESAJ/RwBIAr9HAIgA/0cA/0LBAAgAUHgigFqIAVCIIinIgNBiJGixHhxIgj9ESADQZGixIgBcSIJ/RwBIANBosSIkQJxIgr9HAIgA0HEiJGiBHEiC/0cA/0LBAAgAUHQigFqIAv9ESAI/RwBIAn9HAIgCv0cA/0LBAAgAUHAigFqIAr9ESAL/RwBIAj9HAIgCf0cA/0LBAAgAUGwigFqIAn9ESAK/RwBIAv9HAIgCP0cA/0LBAAgAUGgiwFqIAMgAnMiAkGIkaLEeHEiA/0RIAJBkaLEiAFxIgj9HAEgAkGixIiRAnEiCf0cAiACQcSIkaIEcSIC/RwD/QsEACABQZCLAWogAv0RIAP9HAEgCP0cAiAJ/RwD/QsEACABQYCLAWogCf0RIAL9HAEgA/0cAiAI/RwD/QsEACABQfCKAWogCP0RIAn9HAEgAv0cAiAD/RwD/QsEACAHQQhqIQcgAUHAAWoiAQ0ACyAAQRBqIQFBACECA0AgAUIANwMAIABBCGohASACQQhqIgJBEEkNAAtBACEBQQBBATYC8IkBCyAAQTBqJAAgAQvfBQICfwJ+QQMhAAJAQQAoAviKASIBQX5xQQJHDQBBACgC8IoBIQACQAJAIAFBAkcNAAJAIABFDQBBACEAQQApA8CKAUEAKQPIigEQFEEAQQA2AvCKAUEAIQEDQCABQgA3A8CKAUEIIQEgAEEIaiIAQRBJDQALC0EAQQM2AviKAQwBCyAARQ0AQQAhAEEAKQPAigFBACkDyIoBEBRBAEEANgLwigFBACEBA0AgAUIANwPAigFBCCEBIABBCGoiAEEQSQ0ACwtBACEAQQBBACkDkIoBIgJCO4YgAkIrhkKAgICAgIDA/wCDhCACQhuGQoCAgICA4D+DIAJCC4ZCgICAgPAfg4SEIAJCBYhCgICA+A+DIAJCFYhCgID8B4OEIAJCJYhCgP4DgyACQgOGQjiIhISEIgM3A8CKAUEAQQApA5iKASICQjuGIAJCK4ZCgICAgICAwP8Ag4QgAkIbhkKAgICAgOA/gyACQguGQoCAgIDwH4OEhCACQgWIQoCAgPgPgyACQhWIQoCA/AeDhCACQiWIQoD+A4MgAkIDhkI4iISEhCICNwPIigEgAyACEBRBACEBA0AgAUIANwPAigFBCCEBIABBCGoiAEEQSQ0AC0EAIQBBAEEAKQP4iQEiAkIBiELVqtWq1arVqtUAgyACQgGGQqrVqtWq1arVqn+DhCICQgKIQrPmzJmz5syZM4MgAkIChkLMmbPmzJmz5kyDhCICQgSIQo+evPjw4cOHD4MgAkIEhkLw4cOHj568+HCDhDcD4IoBQQBBACkDgIoBIgJCAYhC1arVqtWq1arVAIMgAkIBhkKq1arVqtWq1ap/g4QiAkICiEKz5syZs+bMmTODIAJCAoZCzJmz5syZs+ZMg4QiAkIEiEKPnrz48OHDhw+DIAJCBIZC8OHDh4+evPhwg4Q3A+iKAUEAQQQ2AviKAUEAQQD9AATgigFBAP0ABLCKAf1R/QsE4IoBCyAAC5oCAgJ/AXtBAyEBAkAgAEFvakF7SQ0AQQAoAviKAUEERw0AIABBHHEhAv0MAAAAAAAAAAAAAAAAAAAAACEDQQAhAQNAIAMgAUGAiwFqKAIAIAFB4IoBaigCAHP9Ef2JAf2pAf1QIQMgAiABQQRqIgFHDQALIAMgAyAD/Q0ICQoLDA0ODwABAgMAAQID/VAiAyADIAP9DQQFBgcAAQIDAAECAwABAgP9UP0bACEBAkAgACACRg0AA0AgASACQYCLAWotAAAgAkHgigFqLQAAc3IhASAAIAJBAWoiAkcNAAsLAkAgAUUNAEEAIQEDQCABQfiJAWpCADcDACABQQhqIgFBhwFNDQALQQQPC0EAIQFBAEEFNgL4igELIAELCxwBAEGAgAELFAAAAAADAAAAAAAAAAMAAAAAAAAA", "AGFzbQEAAAABKAdgA39/fwBgAX8AYAF/AX9gAAF/YAV/f39/fwBgAn5+AGAEfn9/fwADIyIAAQABAQECAwMDAwMDAwMEAgICAgICAQIFAgICAgMDAwIGBAUBcAEBAQUEAQECAgYIAX8BQYCAAQsHxgIZBm1lbW9yeQIACXN0YXRlX3B0cgAMCnN0YXRlX3NpemUADRFzdGF0ZV9jaXBoZXJfc2l6ZQALB2tleV9wdHIACgZpdl9wdHIACQd0YWdfcHRyAA4JaW5wdXRfcHRyAAgOaW5wdXRfY2FwYWNpdHkABwRpbml0AAYLaWdlX2VuY3J5cHQAEQtpZ2VfZGVjcnlwdAAQC2NiY19lbmNyeXB0ABMLY2JjX2RlY3J5cHQAEg1jdHJfdHJhbnNmb3JtABQLZ2NtX3ByZXBhcmUAHglnY21fYmVnaW4AGQlnY21fbm9uY2UAHA1nY21fbm9uY2VfZW5kAB0HZ2NtX2FhZAAVC2djbV9lbmNyeXB0ABsQZ2NtX2F1dGhlbnRpY2F0ZQAXB2djbV90YWcAHwpnY21fdmVyaWZ5ACALZ2NtX2RlY3J5cHQAGgqKdSKuAwICfwd+IwBBIGshA0EAIQQDQCADIARqIAI1AAAiBUIQhiAFhEL//4OA8P8/gyIFQhCGIAVCCIaEIgVCB4ggATUAACIGQhCGIAaEQv//g4Dw/z+DIgZCCIYgBoQiBoVCqoGohaCVgNUAg0KBAX4gBUKA/oP4j+C/gH+DIAZC/4H8h/CfwP8Ag4SFIgVCDoggBYVCzJmDgMCZM4NCgYABfiAFhSIFQhyIIAWFQvDhw4cPg0KBgICAAX4gBYU3AwAgAUEEaiEBIAJBBGohAiAEQQhqIgRBIEcNAAsgACADKQMQIgVCCIggAykDGCIGhUL/gfyH8J/A/wCDIgcgBoUiBiADKQMAIghCCIggAykDCCIJhUL/gfyH8J/A/wCDIgogCYUiCUIQiIVC//+DgPD/P4MiCyAGhSIGPgIMIAAgC0IQhiAJhSIJPgIEIAAgBSAHQgiGhSIFIAggCkIIhoUiB0IQiIVC//+DgPD/P4MiCCAFhSIFPgIIIAAgBkIgiD4CHCAAIAhCEIYgB4UiBj4CACAAIAlCIIg+AhQgACAFQiCIPgIYIAAgBkIgiD4CEAuVBQEbfyAAIAAoAgwiASAAKAIEIgJzIgMgACgCFCIEcyAAKAIYIgUgACgCECIGcyIHIAAoAggiCCAAKAIAIglzcSIKcyAFIAhxIgsgBCACcSIMcyAAKAIcIg0gAXEiDnMiDyAGIAlxIhBzIhFzIA0gBXMiEiABIAhzIhNxIAtzIhQgDnMiFXMiCyANIAFzIg4gBSASIAQgBnMiFnMiFyATIAIgCXMiAXNxc3MgBnMgCnMgECAWIAFxcyAMcyIMcyANIARzIhMgA3EiCnMgFHMiASALIAUgCHMiCCAJcyAKcyARcyIDcSIQQX9zcXMgEHMgCCAEcyANcyAMcyAKcyAPcyAVcyIKIANxIg9zIAEgA3EiFHMiDCAFcSIVIBAgASAPcnMgCiALcSIRcyABIApxIhBzIgUgBHEiGHMgCiALIAFBf3NxcyABcyAUcyAQcyABIBFxIhRzIhAgDXEiGXMiGiALIA8gA3NBf3NxIANzIApzIBFzIAFzIBRzIgEgBnEiA3MiCyAQIAVzIgogE3EiDXM2AhAgACAMIAhxIg8gBSAEIAJzIgRxIgJzIBAgDnEiEXMiEyABIAYgCXMiBnEiFHMiGyAKIA4gBHNxIglzNgIAIAAgCyABIAxzIgogB3EiB3MgECAMcyILIBJxIBVzIgwgGXMiEHM2AhggACAbIAogCCAGc3EiCnMgCyAOIAhzIghxIA9zIg4gEXMiEnM2AgggACANIAEgBXMiASALcyIFIBdxcyAYIAEgFnFzIANzIgtzIAdzIAxzNgIcIAAgCyANcyAacyAQczYCFCAAIAkgBSAIIAQgBnMiBHNxcyACIAEgBHFzIBRzIgFzIApzIA5zNgIMIAAgASAJcyATcyASczYCBAvrBAIBfwd+IwBBIGsiAyAANQIcQiCGIAA1AgyEIgQgADUCFEIghiAANQIEhCIFQhCIhUL//4OA8P8/gyIGIASFIgQgADUCGEIghiAANQIIhCIHIAA1AhBCIIYgADUCAIQiCEIQiIVC//+DgPD/P4MiCSAHhSIHQgiIhUL/gfyH8J/A/wCDIgogBIU3AxggAyAGQhCGIAWFIgQgCUIQhiAIhSIFQgiIhUL/gfyH8J/A/wCDIgYgBIU3AwggAyAKQgiGIAeFNwMQIAMgBkIIhiAFhTcDAAJAAkAgAkUNACADIQBBACEDA0AgASADaiAAKQMAIgRCB4ggBIVCqoGohaCVgNUAg0KBAX4gBIUiBEIOiCAEhULMmYOAwJkzg0KBgAF+IASFIgRCHIggBIVC8OHDhw+DQoGAgIABfiAEhSIEQv+B/Ifwn8D/AIMiBUIIiCAFhCIFQhCIQoCA/P8PgyAFQv//A4OEPgAAIAAgBDcDACACIANqIARCCIhCgID8h/CfwP8AgyAEQoD+g/iP4L+Af4OEIgRCGIhCgID8/w+DIARCCIhC//8Dg4Q+AAAgAEEIaiEAIANBBGoiA0EQRw0ADAILCyADIQBBACEDA0AgACAAKQMAIgRCB4ggBIVCqoGohaCVgNUAg0KBAX4gBIUiBEIOiCAEhULMmYOAwJkzg0KBgAF+IASFIgRCHIggBIVC8OHDhw+DQoGAgIABfiAEhSIENwMAIAEgA2ogBEL/gfyH8J/A/wCDIgRCCIggBIQiBEIQiEKAgPz/D4MgBEL//wODhD4AACAAQQhqIQAgA0EEaiIDQRBHDQALCwuaDgEOfyAAIAAoAgBBACgCxIABcyIBNgIAIAAgACgCBEEAKALIgAFzIgI2AgQgACAAKAIIQQAoAsyAAXMiAzYCCCAAIAAoAgxBACgC0IABcyIENgIMIAAgACgCEEEAKALUgAFzIgU2AhAgACAAKAIUQQAoAtiAAXMiBjYCFCAAIAAoAhhBACgC3IABcyIHNgIYIAAoAhxBACgC4IABcyEIAkBBACgCwIABQQJJDQBBwIABIQlBASEKA0AgACADNgIEIAAgCCAGcyILNgIcIAAgBSAEczYCDCAAIAsgBCADcyIDczYCGCAAIAcgBXMiBCAGczYCECAAIAYgAXMgCHM2AgAgACAFIAJzIAdzIAhzNgIUIAAgBCADcyALczYCCCAAEAEgACgCHCEDIAAgACgCCCIEIAAoAgQiC3MiBUGMmLDgAHFBGHcgBUGDhowYcXIgBUGw4MCBA3FBEHdyIAVBwIGDhnxxQQh3cjYCHCAAKAIMIQEgACAAKAIUIgIgBCAAKAIAIghzIgxzIgZBjJiw4ABxQRh3IAZBg4aMGHFyIAZBsODAgQNxQRB3ciAGQcCBg4Z8cUEId3I2AgwgACADIAAoAhgiByAAKAIQIg1zc0F/cyIGQYyYsOAAcUEYdyAGQYOGjBhxciAGQbDgwIEDcUEQd3IgBkHAgYOGfHFBCHdyNgIYIAAgDSALIAhzcyACIAFzIgtzIgZBjJiw4ABxQRh3IAZBg4aMGHFyIAZBsODAgQNxQRB3ciAGQcCBg4Z8cUEId3I2AhAgACAIIAcgC3MiC3MiCEGMmLDgAHFBGHcgCEGDhowYcXIgCEGw4MCBA3FBEHdyIAhBwIGDhnxxQQh3cjYCCCAAIAcgDHNBf3MiCEGMmLDgAHFBGHcgCEGDhowYcXIgCEGw4MCBA3FBEHdyIAhBwIGDhnxxQQh3cjYCACAAIAMgCyAFc3NBf3MiBUGMmLDgAHFBGHcgBUGDhowYcXIgBUGw4MCBA3FBEHdyIAVBwIGDhnxxQQh3cjYCFCAAIAYgBHNBf3MiBUGMmLDgAHFBGHcgBUGDhowYcXIgBUGw4MCBA3FBEHdyIAVBwIGDhnxxQQh3cjYCBCAAEAQgACAAKAIAIAlBJGooAgBzIgE2AgAgACAAKAIEIAlBKGooAgBzIgI2AgQgACAAKAIIIAlBLGooAgBzIgM2AgggACAAKAIMIAlBMGooAgBzIgQ2AgwgACAAKAIQIAlBNGooAgBzIgU2AhAgACAAKAIUIAlBOGooAgBzIgY2AhQgACAAKAIYIAlBPGooAgBzIgc2AhggACAAKAIcIAlBwABqKAIAcyIINgIcIAlBIGohCSAKQQFqIgpBACgCwIABSQ0ACwsgACADNgIEIAAgCCAGcyIJNgIcIAAgBSAEczYCDCAAIAkgBCADcyIDczYCGCAAIAcgBXMiBCAGczYCECAAIAYgAXMgCHM2AgAgACAFIAJzIAdzIAhzNgIUIAAgBCADcyAJczYCCCAAEAEgACAAKAIYIgYgACgCCCIIIAAoAgAiA3MiBXNBf3MiCUGMmLDgAHFBGHcgCUGDhowYcXIgCUGw4MCBA3FBEHdyIAlBwIGDhnxxQQh3ciIHNgIAIAAoAhwhBCAAIAggACgCBCILcyIJQYyYsOAAcUEYdyAJQYOGjBhxciAJQbDgwIEDcUEQd3IgCUHAgYOGfHFBCHdyIgE2AhwgACgCDCECIAAgACgCFCIKIAVzIgVBjJiw4ABxQRh3IAVBg4aMGHFyIAVBsODAgQNxQRB3ciAFQcCBg4Z8cUEId3IiDDYCDCAAIAQgBiAAKAIQIg1zc0F/cyIFQYyYsOAAcUEYdyAFQYOGjBhxciAFQbDgwIEDcUEQd3IgBUHAgYOGfHFBCHdyIg42AhggACANIAsgA3NzIAogAnMiC3MiBUGMmLDgAHFBGHcgBUGDhowYcXIgBUGw4MCBA3FBEHdyIAVBwIGDhnxxQQh3ciICNgIQIAAgAyAGIAtzIgtzIgZBjJiw4ABxQRh3IAZBg4aMGHFyIAZBsODAgQNxQRB3ciAGQcCBg4Z8cUEId3IiBjYCCCAAIAQgCyAJc3NBf3MiCUGMmLDgAHFBGHcgCUGDhowYcXIgCUGw4MCBA3FBEHdyIAlBwIGDhnxxQQh3ciIDNgIUIAAgBSAIc0F/cyIJQYyYsOAAcUEYdyAJQYOGjBhxciAJQbDgwIEDcUEQd3IgCUHAgYOGfHFBCHdyIgU2AgQgAEEAKALAgAFBBXQiCSgCxIABIAdzNgIAIAAgCSgCyIABIAVzNgIEIAAgCSgCzIABIAZzNgIIIAAgCSgC0IABIAxzNgIMIAAgCSgC1IABIAJzNgIQIAAgCSgC2IABIANzNgIUIAAgCSgC3IABIA5zNgIYIAAgCSgC4IABIAFzNgIcC8UEAQl/IAAgACgCGCIBQQJ2Qb/+/PkDcSABQQZ0QcCBg4Z8cXIiAiABcyIDIAAoAhwiAUECdkG//vz5A3EgAUEGdEHAgYOGfHFyIgQgAXMiAUEEdkGPnrz4AHEgAUEEdEHw4cOHf3FycyAEczYCHCAAIAAoAhQiBEECdkG//vz5A3EgBEEGdEHAgYOGfHFyIgUgBHMiBCADQQR2QY+evPgAcSADQQR0QfDhw4d/cXJzIAJzNgIYIAAgACgCECIDQQJ2Qb/+/PkDcSADQQZ0QcCBg4Z8cXIiBiADcyIDIARBBHZBj568+ABxIARBBHRB8OHDh39xcnMgBXM2AhQgACAAKAIEIgRBAnZBv/78+QNxIARBBnRBwIGDhnxxciIHIARzIgQgACgCCCICQQJ2Qb/+/PkDcSACQQZ0QcCBg4Z8cXIiBSACcyICQQR2QY+evPgAcSACQQR0QfDhw4d/cXJzIAVzNgIIIAAgACgCACIFQQJ2Qb/+/PkDcSAFQQZ0QcCBg4Z8cXIiCCAFcyIFQQR2QY+evPgAcSAFQQR0QfDhw4d/cXIgCHMgAXM2AgAgACAAKAIMIghBAnZBv/78+QNxIAhBBnRBwIGDhnxxciIJIAhzIgggA0EEdkGPnrz4AHEgA0EEdEHw4cOHf3FycyAGcyABczYCECAAIAIgCEEEdkGPnrz4AHEgCEEEdEHw4cOHf3FycyAJcyABczYCDCAAIAUgBEEEdkGPnrz4AHEgBEEEdEHw4cOHf3FycyAHcyABczYCBAuLEQENfyAAIAAoAgBBACgCwIABQQV0IgEoAsSAAXMiAjYCACAAIAAoAgQgASgCyIABcyIDNgIEIAAgACgCCCABKALMgAFzIgQ2AgggACAAKAIMIAEoAtCAAXMiBTYCDCAAIAAoAhAgASgC1IABcyIGNgIQIAAgACgCFCABKALYgAFzIgc2AhQgACAAKAIYIAEoAtyAAXMiCDYCGCAAIAAoAhwgASgC4IABcyIBNgIcAkBBACgCwIABIglBf2oiCkUNACAJQQV0QaSAAWohAQNAIAAoAgghAiAAIAAoAhAiA0GMmLDgAHFBCHcgA0GDhowYcXIgA0Gw4MCBA3FBEHdyIANBwIGDhnxxQRh3ciIEIAAoAgQiA0GMmLDgAHFBCHcgA0GDhowYcXIgA0Gw4MCBA3FBEHdyIANBwIGDhnxxQRh3ciIFc0F/cyIHNgIIIAAgACgCGCIDQYyYsOAAcUEIdyADQYOGjBhxciADQbDgwIEDcUEQd3IgA0HAgYOGfHFBGHdyIgYgAkGMmLDgAHFBCHcgAkGDhowYcXIgAkGw4MCBA3FBEHdyIAJBwIGDhnxxQRh3ciAFcyIIcyAAKAIcIgJBjJiw4ABxQQh3IAJBg4aMGHFyIAJBsODAgQNxQRB3ciACQcCBg4Z8cUEYd3IiA3M2AhwgACAGIAAoAhQiAkGMmLDgAHFBCHcgAkGDhowYcXIgAkGw4MCBA3FBEHdyIAJBwIGDhnxxQRh3cnMiBiAAKAIMIgJBjJiw4ABxQQh3IAJBg4aMGHFyIAJBsODAgQNxQRB3ciACQcCBg4Z8cUEYd3JzIgkgBHM2AhQgACAJIAggACgCACICQYyYsOAAcUEIdyACQYOGjBhxciACQbDgwIEDcUEQd3IgAkHAgYOGfHFBGHdyIgJzIghzNgIMIAAgByADczYCBCAAIAYgBXNBf3M2AgAgACAGIARzIgQgAnNBf3M2AhggACAEIAhzIANzNgIQIAAQASAAKAIIIQMgACAAKAIEIgQ2AgggACAAKAIcIgIgACgCAHMiBjYCACAAKAIUIQggACADIAAoAhAiCXMgACgCGCIFcyIHNgIUIAAoAgwhCyAAIAUgAiAEcyIMcyINNgIMIAAgAiAIIAlzcyIINgIEIAAgByACcyIJNgIcIAAgAyAMIAtzIgJzIgs2AhggACACIAVzIgw2AhAgACABKAIAIAZzIgI2AgAgACABQQRqKAIAIAhzIgM2AgQgACAEIAFBCGooAgBzIgQ2AgggACABQQxqKAIAIA1zIgU2AgwgACABQRBqKAIAIAxzIgY2AhAgACABQRRqKAIAIAdzIgc2AhQgACABQRhqKAIAIAtzIgg2AhggAUEcaigCACELIAAgBkEEdkGPnrz4AHEgBkEEdEHw4cOHf3FyIAZzIAhzNgIYIAAgB0EEdkGPnrz4AHEgB0EEdEHw4cOHf3FyIAdzIAsgCXMiCXM2AhwgACAIQQR2QY+evPgAcSAIQQR0QfDhw4d/cXIgCHMiCCACczYCACAAIAMgA0EEdkGPnrz4AHEgA0EEdEHw4cOHf3FycyAIcyAFczYCDCAAIAVBBHZBj568+ABxIAVBBHRB8OHDh39xciAFcyAHcyAJQQR2QY+evPgAcSAJQQR0QfDhw4d/cXIgCXMiBXM2AhQgACAIIANzIAVzNgIEIAAgBCACQQR2QY+evPgAcSACQQR0QfDhw4d/cXJzIAVzIAJzNgIIIAAgBCAEQQR2QY+evPgAcSAEQQR0QfDhw4d/cXJzIAVzIAZzIAhzNgIQIAAQBCABQWBqIQEgCkF/aiIKDQALIAAoAhwhASAAKAIYIQggACgCFCEHIAAoAhAhBiAAKAIMIQUgACgCCCEEIAAoAgQhAyAAKAIAIQILIAAgBkGMmLDgAHFBCHcgBkGDhowYcXIgBkGw4MCBA3FBEHdyIAZBwIGDhnxxQRh3ciIGIANBjJiw4ABxQQh3IANBg4aMGHFyIANBsODAgQNxQRB3ciADQcCBg4Z8cUEYd3IiA3NBf3MiCTYCCCAAIAhBjJiw4ABxQQh3IAhBg4aMGHFyIAhBsODAgQNxQRB3ciAIQcCBg4Z8cUEYd3IiCCAEQYyYsOAAcUEIdyAEQYOGjBhxciAEQbDgwIEDcUEQd3IgBEHAgYOGfHFBGHdyIANzIgpzIAFBjJiw4ABxQQh3IAFBg4aMGHFyIAFBsODAgQNxQRB3ciABQcCBg4Z8cUEYd3IiAXM2AhwgACAIIAdBjJiw4ABxQQh3IAdBg4aMGHFyIAdBsODAgQNxQRB3ciAHQcCBg4Z8cUEYd3JzIgQgBUGMmLDgAHFBCHcgBUGDhowYcXIgBUGw4MCBA3FBEHdyIAVBwIGDhnxxQRh3cnMiBSAGczYCFCAAIAUgCiACQYyYsOAAcUEIdyACQYOGjBhxciACQbDgwIEDcUEQd3IgAkHAgYOGfHFBGHdyIgJzIgdzNgIMIAAgCSABczYCBCAAIAQgA3NBf3M2AgAgACAEIAZzIgMgAnNBf3M2AhggACADIAdzIAFzNgIQIAAQASAAIAAoAhwiASAAKAIAcyIENgIAIAAoAgQhAiAAIAEgACgCFCAAKAIQIgVzcyIGNgIEIAAoAgghAyAAIAI2AgggAEEAKALEgAEgBHM2AgAgACgCDCEHIAAgASACcyIIIAAoAhgiBHMiCTYCDCAAQQAoAsiAASAGczYCBCAAIAQgCCAHcyIGcyIHNgIQIAAgAkEAKALMgAFzNgIIIAAgBCAFIANzcyICNgIUIABBACgC0IABIAlzNgIMIAAgBiADcyIDNgIYIABBACgC1IABIAdzNgIQIAAgAiABcyIBNgIcIABBACgC2IABIAJzNgIUIABBACgC3IABIANzNgIYIABBACgC4IABIAFzNgIcC8EIARN/IwBBoAJrIgEkAEEAIQIDQCACQcCAAWpCADcDACACQQhqIgJBiAhJDQALQQAhAgNAIAJBwIABakIANwMAIAJBCGoiAkHdA0kNAAtB4AMhAgNAIAJBwIABakEAOgAAIAJBAWoiAkHkA0cNAAtBASEDAkAgAEFwaiICQRBLDQBBASACdEGBggRxRQ0AIAFBIGpBCHIhBEEAIQJBACAAQQJ2QQZqIgU2AsCAAQNAIAFBMGogAmogAkGggAFqLQAAOgAAIAAgAkEBaiICRw0AC0EEIQIDQCABQSBqIAJqQQA6AAAgAkEBaiICQRBHDQALIAFBMGogAGoiA0F8aiEGIAVBBHRBEGohByABQTBqIQggAEEgRyEJIAAhCkEBIQsDQEEAIQIDQCABQSBqIAJqIAYgAmotAAA6AAAgAkEBaiICQQRHDQALAkACQAJAIAogAHAiAg0AIAEtACAhDCABIAEtACE6ACAgASABLwEiOwAhIAEgDDoAIwwBCyAJDQEgAkEQRw0BCyABIAFBIGogAUEgahAAIAEoAgQhDSABIAEoAggiDjYCBCABIAEoAhAiDCABKAIMIg9zNgIMIAEgDCABKAIYIhBzIhEgASgCFCISczYCECABIBIgASgCAHMgASgCHCITczYCACABIBMgEnMiEjYCHCABIBIgDyAOcyIOczYCGCABIBMgECAMIA1zc3M2AhQgASARIA5zIBJzNgIIIAEQASABKAIMIQ0gASABKAIUIg4gASgCCCIMIAEoAgAiEnMiD3M2AgwgASABKAIYIhMgASgCECIQcyABKAIcIhFzQX9zNgIYIAEgEiATIA4gDXMiDXMiDnM2AgggASATIA9zQX9zNgIAIAEgDCABKAIEIhNzIg82AhwgASARIA4gD3NzQX9zNgIUIAEgECATIBJzcyANcyISNgIQIAEgEiAMc0F/czYCBCABIAFBIGpBABACIAINACABIAEtACAgC3M6ACAgC0EHdkGbAmwgC0EBdHMhCwtBACECA0AgAyACaiABQSBqIAJqLQAAIAggAmotAABzOgAAIAJBAWoiAkEERw0ACyAIQQRqIQggA0EEaiEDIAZBBGohBiAKQQRqIgogB0kNAAtBACEGQcSAASEDA0AgASABQTBqIAZBBHRqIgIgAhAAQQAhAgNAIAMgAmogASACaigCADYCACACQQRqIgJBIEcNAAsgA0EgaiEDIAYgBUchAiAGQQFqIQYgAg0AC0EAIQIDQCABQTBqIAJqQgA3AwAgAkEIaiICQfABSQ0ACyABQSBqIQJBACEDA0AgAkIANwAAIAQhAiADQQhqIgNBEEkNAAtBACECA0AgASACakIANwIAIAJBCGoiAkEgSQ0AC0EAIQMLQQAhAkEAQRA2ApSFAQNAIAJBoIABakIANwMAIAJBCGoiAkEgSQ0ACyABQaACaiQAIAMLBgBBgIAECwYAQdCIAQsGAEGkhAELBgBBoIABCwUAQdgECwYAQcCAAQsFAEGICAsGAEGoiAELowUBB38jAEEgayIFJABBACEGAkAgAigCACIHQRBHDQAgA0HAAEkNAEEAIQYDQEHUhAEhCEEAIQkDQEEAIQcDQCAIIAdqIAAgB2otAAA6AAAgB0EBaiIHQRBHDQALQQEhCkEQIQcDQCAHQX9qIgcgAGoiCyAKIAstAABqIgo6AAAgCkEIdiEKIAcgBEsNAAsgCEEQaiEIIAlBAWoiCUEERw0AC0EAIQcDQCAFIAdB1IQBaiIKIAdB5IQBaiILEAAgBRADIAUgCiALEAIgB0EgaiIHQcAARw0AC0EAIQcDQCAFIAdqQgA3AgAgB0EIaiIHQSBJDQALQQAhBwNAIAYgB2pB0IgBaiIKIAopAwAgB0HUhAFqKQIAhTcDACAHQThJIQogB0EIaiEHIAoNAAsgBkHAAGohBiACKAIAIgdBEEcNASADIAZrQT9LDQALCwJAIAYgA08NAANAAkAgB0EQRw0AQQAhBwNAIAEgB2ogACAHai0AADoAACAHQQFqIgdBEEcNAAsgBSABIAEQACAFEANBACEHIAUgAUEAEAIDQCAFIAdqQgA3AgAgB0EIaiIHQSBJDQALQQEhCkEQIQcDQCAHQX9qIgcgAGoiCyAKIAstAABqIgo6AAAgCkEIdiEKIAcgBEsNAAtBACEHIAJBADYCAAsCQEEQIAdrIgogAyAGayILIAogC0kbIghFDQAgBkHQiAFqIQcgASEKIAghCwNAIAcgBy0AACAKIAIoAgBqLQAAczoAACAKQQFqIQogB0EBaiEHIAtBf2oiCw0ACyACKAIAIQcLIAIgByAIaiIHNgIAIAggBmoiBiADSQ0ACwtBlAQhBwNAIAdBwIABakIANwIAIAdB9HtqIQAgB0EIaiEHIABBwABJDQALIAVBIGokAAv9AgIEfwZ+IwBBwABrIgEkAEECIQICQCAAQYCABEsNACAAQQ9xDQBBAyECQQAoAsCAASIDQXZqIgRBBEsNACAEQQJ0KAKAgAEhAgJAIANBdWoOAwEAAQALAkAgAEUNAEEAKQKshAEhBUEAKQKkhAEhBkEAKQK8hAEhB0EAKQK0hAEhCEEAIQMDQCABIAggAykD0IgBIgmFNwMQIAEgByADKQPYiAEiCoU3AxggAUEgaiABQRBqIAFBEGoQACABQSBqEAUgAUEgaiABQRBqQQAQAkEAIQIDQCABQSBqIAJqQgA3AgAgAkEIaiICQSBJDQALQQAgCTcCpIQBQQAgCjcCrIQBIANB0IgBaiAGIAEpAxCFIgg3AwBBACAINwK0hAEgA0HYiAFqIAUgASkDGIUiBzcDAEEAIAc3AryEASAKIQUgCSEGIANBEGoiAyAASQ0ACwsgAUIANwMQIAFCADcDGCABQgA3AyAgAUIANwMIQQAhAgsgAUHAAGokACACC/0CAgR/Bn4jAEHAAGsiASQAQQIhAgJAIABBgIAESw0AIABBD3ENAEEDIQJBACgCwIABIgNBdmoiBEEESw0AIARBAnQoAoCAASECAkAgA0F1ag4DAQABAAsCQCAARQ0AQQApAryEASEFQQApArSEASEGQQApAqyEASEHQQApAqSEASEIQQAhAwNAIAEgCCADKQPQiAEiCYU3AxAgASAHIAMpA9iIASIKhTcDGCABQSBqIAFBEGogAUEQahAAIAFBIGoQAyABQSBqIAFBEGpBABACQQAhAgNAIAFBIGogAmpCADcCACACQQhqIgJBIEkNAAtBACAJNwK0hAFBACAKNwK8hAEgA0HQiAFqIAYgASkDEIUiCDcDAEEAIAg3AqSEASADQdiIAWogBSABKQMYhSIHNwMAQQAgBzcCrIQBIAohBSAJIQYgA0EQaiIDIABJDQALCyABQgA3AxAgAUIANwMYIAFCADcDICABQgA3AwhBACECCyABQcAAaiQAIAILhwUEA38CfgJ/An4jAEEgayIBJABBAiECAkAgAEGAgARLDQAgAEEPcQ0AAkBBACgCwIABIgNBdmoiAkEETQ0AQQMhAgwBCyACQQJ0KAKAgAEhAgJAIANBdWoOAwEAAQALQQAhAwJAIABBwABJDQBBACEDA0AgAykDiIkBIQQgAykDgIkBIQVBACECA0AgAkHUhAFqIAMgAmpB0IgBaikDADcCACACQQhqIgJBwABHDQALQQAhAgNAIAEgAkHUhAFqIgYgAkHkhAFqIgcQACABEAUgASAGIAcQAiACQSBqIgJBwABHDQALQQAhAgNAIAEgAmpCADcCACACQQhqIgJBIEkNAAtBCSEGQcwEIQIDQCADIAJqIgdBvIQBaiAHQayEAWopAwAgAkHAgAFqKQIAhTcDACACQXhqIQIgBkF/aiIGQQNKDQALQQApAqyEASEIQQAgBDcCrIQBQQApAqSEASEEQQAgBTcCpIQBIANB0IgBaiAEQQApAtSEAYU3AwAgA0HYiAFqIAhBACkC3IQBhTcDACAAIANBwABqIgNrQT9LDQALC0F4IQIDQCACQdyEAWpCADcCACACQQhqIgJBMUkNAAsCQCADIABJDQBBACECDAELQQApAqyEASEIQQApAqSEASEJA0AgAykA2IgBIQQgAykA0IgBIQUgASADQdCIAWoiBiAGEAAgARAFIAEgBkEAEAJBACECA0AgASACakIANwIAIAJBCGoiAkEgSQ0A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");
  function check$1(status) {
    if (status === 4)
      throw new AuthenticationError("Invalid AES-GCM authentication tag");
    if (status !== 0)
      throw new CifranteError("WASM AES operation failed");
  }
  function createAesWasm(key) {
    const loaded = load$1();
    if (!loaded)
      return;
    const engine = loaded;
    const stateOffset = engine.state_ptr();
    const stateSize = engine.state_size();
    const cipherSize = engine.state_cipher_size();
    const keyOffset = engine.key_ptr();
    const ivOffset = engine.iv_ptr();
    const tagOffset = engine.tag_ptr();
    const inputOffset = engine.input_ptr();
    const inputCapacity = engine.input_capacity();
    const memory = new Uint8Array(engine.memory.buffer);
    let state;
    let cipherState;
    let inputUsed = 0;
    let gcmReady = false;
    try {
      memory.set(key, keyOffset);
      check$1(engine.init(key.length));
      state = memory.slice(stateOffset, stateOffset + stateSize);
      cipherState = state.subarray(0, cipherSize);
    } finally {
      memory.fill(0, keyOffset, keyOffset + 32);
      memory.fill(0, stateOffset, stateOffset + stateSize);
    }
    const operations = {
      ige: [engine.ige_encrypt, engine.ige_decrypt],
      cbc: [engine.cbc_encrypt, engine.cbc_decrypt],
      ctr: [engine.ctr_transform, engine.ctr_transform]
    };
    function clear(size) {
      memory.fill(0, stateOffset, stateOffset + size);
      memory.fill(0, inputOffset, inputOffset + inputUsed);
      inputUsed = 0;
    }
    function run(source, operation) {
      try {
        memory.set(source, stateOffset);
        return operation();
      } finally {
        clear(source.length);
      }
    }
    function step(working, operation) {
      try {
        memory.set(working, stateOffset);
        const result = operation();
        working.set(memory.subarray(stateOffset, stateOffset + working.length));
        return result;
      } finally {
        clear(working.length);
      }
    }
    function write(data) {
      inputUsed = Math.max(inputUsed, data.length);
      memory.set(data, inputOffset);
    }
    function update(data, operation, output) {
      for (let offset = 0;offset < data.length; offset += inputCapacity) {
        const chunk = data.subarray(offset, offset + inputCapacity);
        write(chunk);
        check$1(operation(chunk.length));
        output?.set(memory.subarray(inputOffset, inputOffset + chunk.length), offset);
      }
    }
    function updateSingle(data, operation) {
      write(data);
      check$1(operation(data.length));
      return memory.slice(inputOffset, inputOffset + data.length);
    }
    async function feed(working, data, operation, output) {
      for (let offset = 0;offset < data.length; offset += SLICE) {
        const slice = data.subarray(offset, offset + SLICE);
        step(working, () => update(slice, operation, output?.subarray(offset)));
        if (offset + SLICE < data.length)
          await yieldNow();
      }
    }
    function beginGcm(nonce, aad) {
      if (nonce.length === 12) {
        memory.set(nonce, ivOffset);
        check$1(engine.gcm_begin(1));
      } else {
        check$1(engine.gcm_begin(0));
        update(nonce, engine.gcm_nonce);
        check$1(engine.gcm_nonce_end());
      }
      update(aad, engine.gcm_aad);
    }
    async function beginGcmAsync(working, nonce, aad) {
      if (nonce.length === 12)
        step(working, () => {
          memory.set(nonce, ivOffset);
          check$1(engine.gcm_begin(1));
        });
      else {
        step(working, () => check$1(engine.gcm_begin(0)));
        await feed(working, nonce, engine.gcm_nonce);
        step(working, () => check$1(engine.gcm_nonce_end()));
      }
      await feed(working, aad, engine.gcm_aad);
    }
    function prepareGcm() {
      if (gcmReady)
        return;
      run(state, () => {
        check$1(engine.gcm_prepare());
        state.set(memory.subarray(stateOffset, stateOffset + stateSize));
      });
      gcmReady = true;
    }
    function tag(length) {
      check$1(engine.gcm_tag());
      return memory.slice(tagOffset, tagOffset + length);
    }
    function verify(expected) {
      check$1(engine.gcm_tag());
      write(expected);
      check$1(engine.gcm_verify(expected.length));
    }
    return {
      transform(mode, data, iv, decrypt) {
        const operation = operations[mode][decrypt ? 1 : 0];
        let output;
        try {
          return run(cipherState, () => {
            memory.set(iv, ivOffset);
            if (data.length <= inputCapacity)
              output = updateSingle(data, operation);
            else {
              output = new Uint8Array(data.length);
              update(data, operation, output);
            }
            return output;
          });
        } catch (error) {
          output?.fill(0);
          throw error;
        }
      },
      async transformAsync(mode, data, iv, decrypt) {
        const operation = operations[mode][decrypt ? 1 : 0];
        const output = new Uint8Array(data.length);
        const working = cipherState.slice();
        try {
          step(working, () => memory.set(iv, ivOffset));
          await feed(working, data, operation, output);
          return output;
        } catch (error) {
          output.fill(0);
          throw error;
        } finally {
          working.fill(0);
        }
      },
      ctrState(iv) {
        const working = cipherState.slice();
        working.set(iv, ivOffset - stateOffset);
        return {
          update(data) {
            const output = new Uint8Array(data.length);
            step(working, () => update(data, engine.ctr_transform, output));
            return output;
          },
          dispose() {
            working.fill(0);
          }
        };
      },
      encryptGcm(data, nonce, aad, tagLength) {
        prepareGcm();
        const ciphertext = new Uint8Array(data.length);
        try {
          return run(state, () => {
            beginGcm(nonce, aad);
            update(data, engine.gcm_encrypt, ciphertext);
            return {
              ciphertext,
              tag: tag(tagLength)
            };
          });
        } catch (error) {
          ciphertext.fill(0);
          throw error;
        }
      },
      async encryptGcmAsync(data, nonce, aad, tagLength) {
        prepareGcm();
        const ciphertext = new Uint8Array(data.length);
        const working = state.slice();
        try {
          await beginGcmAsync(working, nonce, aad);
          await feed(working, data, engine.gcm_encrypt, ciphertext);
          return {
            ciphertext,
            tag: step(working, () => tag(tagLength))
          };
        } catch (error) {
          ciphertext.fill(0);
          throw error;
        } finally {
          working.fill(0);
        }
      },
      decryptGcm(data, nonce, aad, expected) {
        prepareGcm();
        let output;
        try {
          return run(state, () => {
            beginGcm(nonce, aad);
            update(data, engine.gcm_authenticate);
            verify(expected);
            output = new Uint8Array(data.length);
            update(data, engine.gcm_decrypt, output);
            return output;
          });
        } catch (error) {
          output?.fill(0);
          throw error;
        }
      },
      async decryptGcmAsync(data, nonce, aad, expected) {
        prepareGcm();
        const working = state.slice();
        let output;
        try {
          await beginGcmAsync(working, nonce, aad);
          await feed(working, data, engine.gcm_authenticate);
          step(working, () => verify(expected));
          output = new Uint8Array(data.length);
          await feed(working, data, engine.gcm_decrypt, output);
          return output;
        } catch (error) {
          output?.fill(0);
          throw error;
        } finally {
          working.fill(0);
        }
      }
    };
  }
  function multiply(a, b) {
    let result = 0;
    for (let bit = 0;bit < 8; bit++) {
      result ^= a & -(b & 1);
      a = (a << 1 ^ 283 & -(a >>> 7)) & 255;
      b >>>= 1;
    }
    return result;
  }
  var sbox;
  var inverseSbox;
  function initializeTables() {
    if (sbox !== undefined)
      return;
    const forward = /* @__PURE__ */ new Uint8Array(256);
    const reverse = /* @__PURE__ */ new Uint8Array(256);
    for (let value = 0;value < 256; value++) {
      let inverse = 1;
      let power = value;
      for (let exponent = 254;exponent > 0; exponent >>>= 1) {
        if (exponent & 1)
          inverse = multiply(inverse, power);
        power = multiply(power, power);
      }
      let substituted = inverse ^ 99;
      for (let shift = 1;shift <= 4; shift++)
        substituted ^= (inverse << shift | inverse >>> 8 - shift) & 255;
      forward[value] = substituted;
      reverse[substituted] = value;
    }
    inverseSbox = reverse;
    sbox = forward;
  }
  function keyBytes(key) {
    let bytes2;
    try {
      bytes2 = toBinary(key);
    } catch (error) {
      if (error instanceof InvalidInputError)
        throw new InvalidKeyError("AES key must be binary data");
      throw error;
    }
    if (bytes2.length !== 16 && bytes2.length !== 24 && bytes2.length !== 32)
      throw new InvalidKeyError("AES key must contain 16, 24 or 32 bytes");
    return bytes2;
  }
  function ivBytes(options, length, copy = true) {
    if (!options || typeof options !== "object" || Array.isArray(options))
      throw new InvalidInputError("AES operation requires IV options");
    let bytes2;
    try {
      bytes2 = copy ? toBinary(options.iv) : toBinaryView(options.iv);
    } catch (error) {
      if (error instanceof InvalidInputError)
        throw new InvalidIVError("AES IV must be binary data");
      throw error;
    }
    if (bytes2.length !== length)
      throw new InvalidIVError(`AES IV must contain ${length} bytes`);
    return bytes2;
  }
  var AesBlock = class {
    constructor(key) {
      initializeTables();
      this.rounds = key.length / 4 + 6;
      this.schedule = new Uint8Array((this.rounds + 1) * 16);
      this.schedule.set(key);
      const word = /* @__PURE__ */ new Uint8Array(4);
      let rcon = 1;
      for (let offset = key.length;offset < this.schedule.length; offset += 4) {
        word.set(this.schedule.subarray(offset - 4, offset));
        if (offset % key.length === 0) {
          const first = word[0];
          word[0] = sbox[word[1]] ^ rcon;
          word[1] = sbox[word[2]];
          word[2] = sbox[word[3]];
          word[3] = sbox[first];
          rcon = multiply(rcon, 2);
        } else if (key.length === 32 && offset % key.length === 16)
          for (let i = 0;i < 4; i++)
            word[i] = sbox[word[i]];
        for (let i = 0;i < 4; i++)
          this.schedule[offset + i] = this.schedule[offset + i - key.length] ^ word[i];
      }
    }
    encrypt(input) {
      const state = new Uint8Array(input);
      this.addRoundKey(state, 0);
      for (let round = 1;round <= this.rounds; round++) {
        for (let i = 0;i < 16; i++)
          state[i] = sbox[state[i]];
        this.shiftRows(state, false);
        if (round < this.rounds)
          this.mixColumns(state, false);
        this.addRoundKey(state, round);
      }
      return state;
    }
    decrypt(input) {
      const state = new Uint8Array(input);
      this.addRoundKey(state, this.rounds);
      for (let round = this.rounds - 1;round >= 0; round--) {
        this.shiftRows(state, true);
        for (let i = 0;i < 16; i++)
          state[i] = inverseSbox[state[i]];
        this.addRoundKey(state, round);
        if (round > 0)
          this.mixColumns(state, true);
      }
      return state;
    }
    addRoundKey(state, round) {
      for (let i = 0;i < 16; i++)
        state[i] ^= this.schedule[round * 16 + i];
    }
    shiftRows(state, inverse) {
      const copy = state.slice();
      for (let row = 1;row < 4; row++)
        for (let column = 0;column < 4; column++) {
          const source = (column + (inverse ? 4 - row : row)) % 4;
          state[column * 4 + row] = copy[source * 4 + row];
        }
    }
    mixColumns(state, inverse) {
      for (let offset = 0;offset < 16; offset += 4) {
        let a = state[offset], b = state[offset + 1], c = state[offset + 2], d = state[offset + 3];
        if (inverse) {
          const ac = multiply(a ^ c, 4);
          const bd = multiply(b ^ d, 4);
          a ^= ac;
          c ^= ac;
          b ^= bd;
          d ^= bd;
        }
        const total = a ^ b ^ c ^ d;
        state[offset] = a ^ total ^ multiply(a ^ b, 2);
        state[offset + 1] = b ^ total ^ multiply(b ^ c, 2);
        state[offset + 2] = c ^ total ^ multiply(c ^ d, 2);
        state[offset + 3] = d ^ total ^ multiply(d ^ a, 2);
      }
    }
  };
  function cbc(key) {
    const secret = keyBytes(key);
    const native = nativeCipher("cbc", secret);
    const prepare2 = lazy(() => createAesWasm(secret));
    let block;
    function fallback(data, initial, decrypt) {
      block ?? (block = new AesBlock(secret));
      const output = new Uint8Array(data.length);
      let previous = initial;
      const mixed = /* @__PURE__ */ new Uint8Array(16);
      for (let offset = 0;offset < data.length; offset += 16) {
        const input = data.subarray(offset, offset + 16);
        if (decrypt) {
          const result = block.decrypt(input);
          for (let i = 0;i < 16; i++)
            output[offset + i] = result[i] ^ previous[i];
          previous = input;
        } else {
          for (let i = 0;i < 16; i++)
            mixed[i] = input[i] ^ previous[i];
          previous = block.encrypt(mixed);
          output.set(previous, offset);
        }
      }
      mixed.fill(0);
      return output;
    }
    function transform(data, initial, decrypt) {
      const wasm2 = prepare2();
      return wasm2 ? wasm2.transform("cbc", data, initial, decrypt) : fallback(data, initial, decrypt);
    }
    async function transformAsync(data, initial, decrypt) {
      if (data.length <= SLICE)
        return transform(data, initial, decrypt);
      const wasm2 = prepare2();
      return wasm2 ? wasm2.transformAsync("cbc", data, initial, decrypt) : fallback(data, initial, decrypt);
    }
    function pad(input) {
      const padding = 16 - input.length % 16;
      const padded = new Uint8Array(input.length + padding);
      padded.set(input);
      padded.fill(padding, input.length);
      return padded;
    }
    function validate(input) {
      if (input.length === 0 || input.length % 16 !== 0)
        throw new InvalidInputError("AES-CBC ciphertext must contain nonempty complete 16-byte blocks");
    }
    function unpad(output) {
      const padding = output[output.length - 1];
      let invalid = Number(padding === 0 || padding > 16);
      for (let i = 1;i <= 16; i++)
        invalid |= (output[output.length - i] ^ padding) & -(i <= padding ? 1 : 0);
      if (invalid !== 0) {
        output.fill(0);
        throw new AuthenticationError("Invalid AES-CBC padding");
      }
      const plaintext = output.slice(0, output.length - padding);
      output.fill(0);
      return plaintext;
    }
    return {
      async encrypt(data, options) {
        const useNative = native.available();
        const input = useNative ? toBytes(data) : toBytesView(data);
        const initial = ivBytes(options, 16, useNative);
        if (useNative) {
          const result = await native.encrypt(initial, input);
          if (result !== undefined)
            return result;
        }
        const padded = pad(input);
        try {
          return await transformAsync(padded, initial, false);
        } finally {
          padded.fill(0);
        }
      },
      async decrypt(data, options) {
        const useNative = native.available();
        const input = useNative ? toBinary(data) : toBinaryView(data);
        const initial = ivBytes(options, 16, useNative);
        validate(input);
        if (useNative) {
          const decrypted = await native.decrypt(initial, input);
          if (decrypted !== undefined)
            return decrypted;
        }
        return unpad(await transformAsync(input, initial, true));
      },
      encryptSync(data, options) {
        const input = toBytesView(data);
        const initial = ivBytes(options, 16, false);
        const result = native.encryptSync?.(initial, input);
        if (result !== undefined)
          return result;
        const padded = pad(input);
        try {
          return transform(padded, initial, false);
        } finally {
          padded.fill(0);
        }
      },
      decryptSync(data, options) {
        const input = toBinaryView(data);
        const initial = ivBytes(options, 16, false);
        validate(input);
        return native.decryptSync?.(initial, input) ?? unpad(transform(input, initial, true));
      }
    };
  }
  function ctr(key) {
    const secret = keyBytes(key);
    const native = nativeCipher("ctr", secret);
    const prepare2 = lazy(() => createAesWasm(secret));
    let block;
    function software(initial) {
      block ?? (block = new AesBlock(secret));
      const counter = Uint8Array.from(initial);
      let keystream = /* @__PURE__ */ new Uint8Array(16);
      let used = 16;
      return {
        update(data) {
          const output = new Uint8Array(data.length);
          for (let offset = 0;offset < data.length; ) {
            if (used === 16) {
              keystream = block.encrypt(counter);
              used = 0;
              for (let i = 15;i >= 0; i--) {
                counter[i] = counter[i] + 1 & 255;
                if (counter[i] !== 0)
                  break;
              }
            }
            const count = Math.min(16 - used, data.length - offset);
            for (let i = 0;i < count; i++)
              output[offset + i] = data[offset + i] ^ keystream[used + i];
            used += count;
            offset += count;
          }
          return output;
        },
        dispose() {
          counter.fill(0);
          keystream.fill(0);
        }
      };
    }
    function transform(data, initial, decrypt) {
      const wasm2 = prepare2();
      return wasm2 ? wasm2.transform("ctr", data, initial, decrypt) : software(initial).update(data);
    }
    async function transformAsync(data, initial, decrypt, useNative) {
      if (useNative) {
        const result = await (decrypt ? native.decrypt(initial, data) : native.encrypt(initial, data));
        if (result !== undefined)
          return result;
      }
      if (data.length <= SLICE)
        return transform(data, initial, decrypt);
      const wasm2 = prepare2();
      return wasm2 ? wasm2.transformAsync("ctr", data, initial, decrypt) : software(initial).update(data);
    }
    function transformSync(data, initial, decrypt) {
      return (decrypt ? native.decryptSync?.(initial, data) : native.encryptSync?.(initial, data)) ?? transform(data, initial, decrypt);
    }
    return {
      async encrypt(data, options) {
        const useNative = native.available();
        return transformAsync(useNative ? toBytes(data) : toBytesView(data), ivBytes(options, 16, useNative), false, useNative);
      },
      async decrypt(data, options) {
        const useNative = native.available();
        return transformAsync(useNative ? toBinary(data) : toBinaryView(data), ivBytes(options, 16, useNative), true, useNative);
      },
      encryptSync(data, options) {
        return transformSync(toBytesView(data), ivBytes(options, 16, false), false);
      },
      decryptSync(data, options) {
        return transformSync(toBinaryView(data), ivBytes(options, 16, false), true);
      },
      create(options) {
        const initial = ivBytes(options, 16);
        const state = native.stream?.(initial) ?? prepare2()?.ctrState(initial) ?? software(initial);
        let disposed = false;
        return {
          update(data) {
            if (disposed)
              throw new InvalidInputError("AES-CTR state has been disposed");
            const input = toBytesView(data);
            return input.length === 0 ? /* @__PURE__ */ new Uint8Array : state.update(input);
          },
          dispose() {
            if (!disposed) {
              disposed = true;
              state.dispose();
            }
          }
        };
      }
    };
  }
  var GHash = class {
    constructor(hashKey) {
      this.h = /* @__PURE__ */ new Uint32Array(4);
      this.state = /* @__PURE__ */ new Uint32Array(4);
      for (let i = 0;i < 16; i++)
        this.h[i >>> 2] |= hashKey[i] << 24 - (i & 3) * 8;
    }
    update(data) {
      for (let offset = 0;offset < data.length; offset += 16) {
        for (let i = 0;i < Math.min(16, data.length - offset); i++)
          this.state[i >>> 2] ^= data[offset + i] << 24 - (i & 3) * 8;
        let a = 0, b = 0, c = 0, d = 0;
        let v0 = this.h[0], v1 = this.h[1], v2 = this.h[2], v3 = this.h[3];
        for (let bit = 0;bit < 128; bit++) {
          const mask = -(this.state[bit >>> 5] >>> 31 - (bit & 31) & 1);
          a ^= v0 & mask;
          b ^= v1 & mask;
          c ^= v2 & mask;
          d ^= v3 & mask;
          const reduction = -(v3 & 1) & 3774873600;
          v3 = v3 >>> 1 | v2 << 31;
          v2 = v2 >>> 1 | v1 << 31;
          v1 = v1 >>> 1 | v0 << 31;
          v0 = v0 >>> 1 ^ reduction;
        }
        this.state[0] = a;
        this.state[1] = b;
        this.state[2] = c;
        this.state[3] = d;
      }
      return this;
    }
    finish(firstLength, secondLength) {
      const lengths = /* @__PURE__ */ new Uint8Array(16);
      const view = new DataView(lengths.buffer);
      view.setUint32(0, Math.floor(firstLength / 536870912));
      view.setUint32(4, firstLength * 8 >>> 0);
      view.setUint32(8, Math.floor(secondLength / 536870912));
      view.setUint32(12, secondLength * 8 >>> 0);
      this.update(lengths);
      for (let i = 0;i < 4; i++)
        view.setUint32(i * 4, this.state[i]);
      return lengths;
    }
  };
  function nonceBytes(nonce) {
    let bytes2;
    try {
      bytes2 = toBinaryView(nonce);
    } catch (error) {
      if (error instanceof InvalidInputError)
        throw new InvalidNonceError("AES-GCM nonce must be binary data");
      throw error;
    }
    if (bytes2.length === 0)
      throw new InvalidNonceError("AES-GCM nonce must not be empty");
    return bytes2;
  }
  function checkLength(length) {
    if (length > 2 ** 36 - 32)
      throw new InvalidInputError("AES-GCM input exceeds the 2^39 - 256 bit limit");
  }
  function operationBytes(options) {
    if (!options || typeof options !== "object" || Array.isArray(options))
      throw new InvalidInputError("AES-GCM operation requires nonce options");
    return {
      nonce: nonceBytes(options.nonce),
      aad: options.aad === undefined ? /* @__PURE__ */ new Uint8Array(0) : toBytesView(options.aad)
    };
  }
  function gcm(key, options = {}) {
    const secret = keyBytes(key);
    if (options === null || typeof options !== "object" || Array.isArray(options))
      throw new InvalidInputError("Invalid AES-GCM options");
    const tagBits = options.tagLength === undefined ? 128 : options.tagLength;
    if (![
      96,
      104,
      112,
      120,
      128
    ].includes(tagBits))
      throw new InvalidInputError("AES-GCM tagLength must be 96, 104, 112, 120 or 128 bits");
    const tagLength = tagBits / 8;
    const native = nativeGcm(secret);
    const prepareWasm = lazy(() => createAesWasm(secret));
    let block;
    let hashKey;
    function prepare2() {
      if (block !== undefined)
        return block;
      block = new AesBlock(secret);
      hashKey = block.encrypt(/* @__PURE__ */ new Uint8Array(16));
      return block;
    }
    function initialCounter(nonce) {
      prepare2();
      if (nonce.length === 12) {
        const j0 = /* @__PURE__ */ new Uint8Array(16);
        j0.set(nonce);
        j0[15] = 1;
        return j0;
      }
      return new GHash(hashKey).update(nonce).finish(0, nonce.length);
    }
    function authenticationTag(ciphertext, aad, j0) {
      const cipher = prepare2();
      const hash = new GHash(hashKey).update(aad).update(ciphertext).finish(aad.length, ciphertext.length);
      const mask = cipher.encrypt(j0);
      for (let i = 0;i < 16; i++)
        hash[i] ^= mask[i];
      return hash.slice(0, tagLength);
    }
    function transform(data, j0) {
      const cipher = prepare2();
      const counter = j0.slice();
      const output = new Uint8Array(data.length);
      for (let offset = 0;offset < data.length; offset += 16) {
        for (let i = 15;i >= 12; i--) {
          counter[i] = counter[i] + 1 & 255;
          if (counter[i] !== 0)
            break;
        }
        const stream = cipher.encrypt(counter);
        for (let i = 0;i < Math.min(16, data.length - offset); i++)
          output[offset + i] = data[offset + i] ^ stream[i];
      }
      return output;
    }
    function seal(input, nonce, aad) {
      const j0 = initialCounter(nonce);
      const ciphertext = transform(input, j0);
      return {
        ciphertext,
        tag: authenticationTag(ciphertext, aad, j0)
      };
    }
    function open(ciphertext, nonce, aad, tag) {
      const j0 = initialCounter(nonce);
      const expected = authenticationTag(ciphertext, aad, j0);
      let difference = 0;
      for (let i = 0;i < tagLength; i++)
        difference |= expected[i] ^ tag[i];
      if (difference !== 0)
        throw new AuthenticationError("Invalid AES-GCM authentication tag");
      return transform(ciphertext, j0);
    }
    return {
      async encrypt(data, options2) {
        const view = operationBytes(options2);
        const useNative = native.available(view.nonce);
        const input = useNative ? toBytes(data) : toBytesView(data);
        const nonce = useNative ? Uint8Array.from(view.nonce) : view.nonce;
        const aad = useNative ? Uint8Array.from(view.aad) : view.aad;
        checkLength(input.length);
        if (useNative) {
          const result = await native.encrypt(nonce, input, aad, tagLength);
          if (result !== undefined)
            return result;
        }
        const wasm2 = prepareWasm();
        if (wasm2) {
          if (input.length + aad.length > SLICE)
            return wasm2.encryptGcmAsync(input, nonce, aad, tagLength);
          return wasm2.encryptGcm(input, nonce, aad, tagLength);
        }
        return seal(input, nonce, aad);
      },
      async decrypt(data, options2) {
        if (data === null || typeof data !== "object")
          throw new InvalidInputError("AES-GCM requires ciphertext and tag");
        const view = operationBytes(options2);
        const useNative = native.available(view.nonce);
        const ciphertext = useNative ? toBinary(data.ciphertext) : toBinaryView(data.ciphertext);
        const tag = useNative ? toBinary(data.tag) : toBinaryView(data.tag);
        const nonce = useNative ? Uint8Array.from(view.nonce) : view.nonce;
        const aad = useNative ? Uint8Array.from(view.aad) : view.aad;
        if (tag.length !== tagLength)
          throw new AuthenticationError("Invalid AES-GCM authentication tag");
        checkLength(ciphertext.length);
        if (useNative) {
          const result = await native.decrypt(nonce, ciphertext, aad, tag);
          if (result !== undefined)
            return result;
        }
        const wasm2 = prepareWasm();
        if (wasm2) {
          if (ciphertext.length + aad.length > SLICE)
            return wasm2.decryptGcmAsync(useNative ? ciphertext : ciphertext.slice(), nonce, aad, tag);
          return wasm2.decryptGcm(ciphertext, nonce, aad, tag);
        }
        return open(ciphertext, nonce, aad, tag);
      },
      encryptSync(data, options2) {
        const { nonce, aad } = operationBytes(options2);
        const input = toBytesView(data);
        checkLength(input.length);
        const result = native.encryptSync?.(nonce, input, aad, tagLength);
        if (result !== undefined)
          return result;
        const wasm2 = prepareWasm();
        return wasm2 ? wasm2.encryptGcm(input, nonce, aad, tagLength) : seal(input, nonce, aad);
      },
      decryptSync(data, options2) {
        if (data === null || typeof data !== "object")
          throw new InvalidInputError("AES-GCM requires ciphertext and tag");
        const { nonce, aad } = operationBytes(options2);
        const ciphertext = toBinaryView(data.ciphertext);
        const tag = toBinaryView(data.tag);
        if (tag.length !== tagLength)
          throw new AuthenticationError("Invalid AES-GCM authentication tag");
        checkLength(ciphertext.length);
        const result = native.decryptSync?.(nonce, ciphertext, aad, tag);
        if (result !== undefined)
          return result;
        const wasm2 = prepareWasm();
        return wasm2 ? wasm2.decryptGcm(ciphertext, nonce, aad, tag) : open(ciphertext, nonce, aad, tag);
      }
    };
  }
  var CBC_SYNC_THRESHOLD = 512;
  var CBC_ASYNC_THRESHOLD = 65536;
  var ZERO_BLOCK = /* @__PURE__ */ new Uint8Array(16);
  function words(bytes2) {
    return new Uint32Array(bytes2.buffer, bytes2.byteOffset, bytes2.length >>> 2);
  }
  function aligned(bytes2) {
    return bytes2.byteOffset % 4 === 0 && bytes2.buffer instanceof ArrayBuffer ? bytes2 : Uint8Array.from(bytes2);
  }
  function chainInput(data, before, previous) {
    const prepared = Uint8Array.from(data);
    const target = words(prepared);
    const first = words(aligned(before));
    const second = words(aligned(previous));
    for (let i = target.length - 1;i >= 8; i--)
      target[i] ^= target[i - 8];
    for (let i = 0;i < Math.min(4, target.length); i++)
      target[i] ^= first[i];
    for (let i = 4;i < Math.min(8, target.length); i++)
      target[i] ^= second[i - 4];
    return prepared;
  }
  function chainOutput(blocks, prepared, before, previous, output) {
    const target = words(output);
    const source = words(aligned(blocks));
    const chain = words(prepared);
    const even = Uint32Array.from(words(aligned(before)));
    const odd = Uint32Array.from(words(aligned(previous)));
    for (let i = 0;i < target.length; i += 4) {
      const history = i >>> 2 & 1 ? odd : even;
      for (let j = 0;j < 4; j++) {
        const plain = chain[i + j] ^ history[j];
        target[i + j] = source[i + j] ^ (i >>> 2 & 1 ? even : odd)[j];
        history[j] = plain;
      }
    }
    const count = target.length >>> 2;
    const last = new Uint8Array((count & 1 ? even : odd).buffer);
    return [new Uint8Array((count & 1 ? odd : even).buffer), last];
  }
  function continuation(input, output, end, decrypt) {
    const iv = /* @__PURE__ */ new Uint8Array(32);
    iv.set((decrypt ? input : output).subarray(end - 16, end));
    iv.set((decrypt ? output : input).subarray(end - 16, end), 16);
    return iv;
  }
  function ige(key) {
    const secret = keyBytes(key);
    const accelerated = nativeIge();
    const native = nativeCipher("cbc", secret);
    const prepare2 = lazy(() => createAesWasm(secret));
    let block;
    function validate(data) {
      if (data.length % 16 !== 0)
        throw new InvalidInputError("AES-IGE input must contain complete 16-byte blocks");
    }
    function fallback(data, initial, decrypt) {
      block ?? (block = new AesBlock(secret));
      const output = new Uint8Array(data.length);
      let previousCiphertext = initial.subarray(0, 16);
      let previousPlaintext = initial.subarray(16, 32);
      const mixed = /* @__PURE__ */ new Uint8Array(16);
      for (let offset = 0;offset < data.length; offset += 16) {
        const input = data.subarray(offset, offset + 16);
        const before = decrypt ? previousPlaintext : previousCiphertext;
        const after = decrypt ? previousCiphertext : previousPlaintext;
        for (let i = 0;i < 16; i++)
          mixed[i] = input[i] ^ before[i];
        const result = decrypt ? block.decrypt(mixed) : block.encrypt(mixed);
        for (let i = 0;i < 16; i++)
          result[i] ^= after[i];
        output.set(result, offset);
        previousCiphertext = decrypt ? input : result;
        previousPlaintext = decrypt ? result : input;
      }
      return output;
    }
    function portable(data, initial, decrypt) {
      const wasm2 = prepare2();
      return wasm2 ? wasm2.transform("ige", data, initial, decrypt) : fallback(data, initial, decrypt);
    }
    function accelerate(data, initial, decrypt, output) {
      if (decrypt)
        accelerated.decrypt(secret, initial, data, output);
      else
        accelerated.encrypt(secret, initial, data, output);
    }
    async function accelerateAsync(data, initial, decrypt) {
      const output = new Uint8Array(data.length);
      let iv = initial;
      for (let offset = 0;offset < data.length; offset += SLICE) {
        const end = Math.min(offset + SLICE, data.length);
        accelerate(data.subarray(offset, end), iv, decrypt, output.subarray(offset, end));
        if (end < data.length) {
          iv = continuation(data, output, end, decrypt);
          await yieldNow();
        }
      }
      return output;
    }
    function encryptCbc(data, initial, encryptBlocks) {
      const output = new Uint8Array(data.length);
      let chain = Uint8Array.from(initial.subarray(0, 16));
      let before = ZERO_BLOCK;
      let previous = Uint8Array.from(initial.subarray(16, 32));
      for (let offset = 0;offset < data.length; offset += SLICE) {
        const slice = data.subarray(offset, offset + SLICE);
        const prepared = chainInput(slice, before, previous);
        const blocks = encryptBlocks(chain, prepared);
        if (blocks === undefined)
          return;
        [before, previous] = chainOutput(blocks, prepared, before, previous, output.subarray(offset, offset + slice.length));
        chain = Uint8Array.from(blocks.subarray(blocks.length - 16));
      }
      return output;
    }
    async function encryptCbcAsync(data, initial) {
      const sync = native.encryptBlocksSync !== undefined;
      const threshold = sync ? CBC_SYNC_THRESHOLD : CBC_ASYNC_THRESHOLD;
      if (data.length < threshold || !native.available() || !sync && !native.encryptBlocks)
        return;
      if (data.length <= SLICE && sync)
        return encryptCbc(data, initial, native.encryptBlocksSync);
      const output = new Uint8Array(data.length);
      let chain = Uint8Array.from(initial.subarray(0, 16));
      let before = ZERO_BLOCK;
      let previous = Uint8Array.from(initial.subarray(16, 32));
      for (let offset = 0;offset < data.length; offset += SLICE) {
        const slice = data.subarray(offset, offset + SLICE);
        const prepared = chainInput(slice, before, previous);
        const blocks = sync ? native.encryptBlocksSync(chain, prepared) : await native.encryptBlocks(chain, prepared);
        if (blocks === undefined)
          return;
        [before, previous] = chainOutput(blocks, prepared, before, previous, output.subarray(offset, offset + slice.length));
        chain = Uint8Array.from(blocks.subarray(blocks.length - 16));
        if (sync && offset + SLICE < data.length)
          await yieldNow();
      }
      return output;
    }
    function transform(data, initial, decrypt) {
      validate(data);
      if (data.length === 0)
        return /* @__PURE__ */ new Uint8Array;
      if (accelerated) {
        const output = new Uint8Array(data.length);
        accelerate(data, initial, decrypt, output);
        return output;
      }
      if (!decrypt && data.length >= CBC_SYNC_THRESHOLD && native.encryptBlocksSync && native.available()) {
        const output = encryptCbc(data, initial, native.encryptBlocksSync);
        if (output !== undefined)
          return output;
      }
      return portable(data, initial, decrypt);
    }
    async function transformAsync(data, initial, decrypt) {
      validate(data);
      if (data.length === 0)
        return /* @__PURE__ */ new Uint8Array;
      if (accelerated)
        return accelerateAsync(data, initial, decrypt);
      if (!decrypt) {
        const output = await encryptCbcAsync(data, initial);
        if (output !== undefined)
          return output;
      }
      if (data.length <= SLICE)
        return portable(data, initial, decrypt);
      const wasm2 = prepare2();
      return wasm2 ? wasm2.transformAsync("ige", data, initial, decrypt) : fallback(data, initial, decrypt);
    }
    return {
      async encrypt(data, options) {
        return transformAsync(toBytesView(data), ivBytes(options, 32, false), false);
      },
      async decrypt(data, options) {
        return transformAsync(toBinaryView(data), ivBytes(options, 32, false), true);
      },
      encryptSync(data, options) {
        return transform(toBytesView(data), ivBytes(options, 32, false), false);
      },
      decryptSync(data, options) {
        return transform(toBinaryView(data), ivBytes(options, 32, false), true);
      }
    };
  }
  var aes = {
    ige,
    ctr,
    cbc,
    gcm
  };
  var State = class extends AsyncDigest {
    async verify(mac) {
      const signature = toBinary(mac);
      return equalBinary(await this.digest(), signature);
    }
  };
  var JsHmac = class {
    constructor(hash, key, blockSize) {
      const reduced = key.length > blockSize ? hash(key) : key;
      const pad = new Uint8Array(blockSize);
      pad.set(reduced);
      for (let i = 0;i < blockSize; i++)
        pad[i] ^= 54;
      this.inner = hash.create().update(pad);
      for (let i = 0;i < blockSize; i++)
        pad[i] ^= 106;
      this.outer = hash.create().update(pad);
      pad.fill(0);
      if (reduced !== key)
        reduced.fill(0);
    }
    update(data) {
      this.inner.update(data);
    }
    digest() {
      const inner = this.inner.digest();
      this.outer.update(inner);
      inner.fill(0);
      return this.outer.digest();
    }
  };
  function createSyncHmac(name, hash, blockSize) {
    const create = (key) => {
      const value = toBinary(key);
      try {
        return new SyncDigest(nativeHmac(name, value) ?? new JsHmac(hash, value, blockSize), "HMAC");
      } finally {
        value.fill(0);
      }
    };
    const mac = (key, data) => create(key).update(data).digest();
    return Object.assign(mac, { create });
  }
  async function macAsync(sync, key, input) {
    if (input.length <= SLICE)
      return sync(key, input);
    const state = sync.create(key);
    await forEachSlice(input, SLICE, (slice) => {
      state.update(slice);
    });
    return state.digest();
  }
  function createHmac(name, sync) {
    const create = (key) => new State(sync.create(key));
    const mac = async (key, data) => {
      const value = toBinary(key);
      try {
        if (!nativeMacAvailable(name, value))
          return await macAsync(sync, value, toBytesView(data));
        const input = toBytes(data);
        const native = await nativeMac(name, value, input);
        return native === undefined ? await macAsync(sync, value, input) : native;
      } finally {
        value.fill(0);
      }
    };
    return Object.assign(mac, {
      verify: async (key, data, signature) => {
        const expected = toBinary(signature);
        return equalBinary(await mac(key, data), expected);
      },
      hex: async (key, data) => encodeHex(await mac(key, data)),
      create,
      sync
    });
  }
  var hmacSha256Sync = /* @__PURE__ */ createSyncHmac("sha256", sha256Sync, 64);
  var hmacSha512Sync = /* @__PURE__ */ createSyncHmac("sha512", sha512Sync, 128);
  var hmac = {
    sha256: /* @__PURE__ */ createHmac("sha256", hmacSha256Sync),
    sha512: /* @__PURE__ */ createHmac("sha512", hmacSha512Sync)
  };
