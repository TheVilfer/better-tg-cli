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
  var createSha256Wasm = /* @__PURE__ */ wasmHash("", "SHA-256", 32);
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
  var createSha512Wasm = /* @__PURE__ */ wasmHash("", "SHA-512", 64);
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
  var load$1 = /* @__PURE__ */ wasm("", "", "");
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
  var load = /* @__PURE__ */ wasm("");
  var prepare = /* @__PURE__ */ lazy(() => {
    const engine = load();
    if (!engine)
      return;
    return {
      engine,
      memory: new Uint8Array(engine.memory.buffer),
      stateOffset: engine.state_ptr(),
      stateSize: engine.state_size(),
      inputOffset: engine.input_ptr(),
      inputCapacity: engine.input_capacity(),
      outputOffset: engine.output_ptr()
    };
  });
  function check(status) {
    if (status === 1)
      throw new InvalidInputError("Message is too long for this hash");
    if (status !== 0)
      throw new CifranteError("WASM PBKDF2 operation failed");
  }
  function parameters(hash) {
    return {
      algorithm: hash === "sha1" ? 1 : hash === "sha256" ? 256 : 512,
      size: hash === "sha1" ? 20 : hash === "sha256" ? 32 : 64,
      blockSize: hash === "sha512" ? 128 : 64
    };
  }
  function pbkdf2Wasm(hash, password, salt, iterations, length) {
    const context = prepare();
    if (!context)
      return;
    const { engine, memory, inputOffset, inputCapacity, outputOffset } = context;
    const { algorithm, size, blockSize } = parameters(hash);
    const output = new Uint8Array(length);
    function update(data, operation) {
      for (let offset = 0;offset < data.length; offset += inputCapacity) {
        const chunk = data.subarray(offset, offset + inputCapacity);
        memory.set(chunk, inputOffset);
        check(operation(chunk.length));
      }
    }
    try {
      check(engine.init(algorithm, password.length > blockSize ? 1 : 0));
      update(password, engine.password_update);
      check(engine.password_finalize());
      update(salt, engine.salt_update);
      const iterationsLow = iterations >>> 0;
      const iterationsHigh = Math.floor(iterations / 4294967296);
      for (let index = 1, offset = 0;offset < length; index++, offset += size) {
        check(engine.derive(index, iterationsLow, iterationsHigh));
        output.set(memory.subarray(outputOffset, outputOffset + Math.min(size, length - offset)), offset);
      }
      return output;
    } catch (error) {
      output.fill(0);
      throw error;
    } finally {
      engine.clear();
    }
  }
  async function pbkdf2WasmAsync(hash, password, salt, iterations, length) {
    const context = prepare();
    if (!context)
      return;
    const { engine, memory, stateOffset, stateSize, inputOffset, inputCapacity, outputOffset } = context;
    const { algorithm, size, blockSize } = parameters(hash);
    const output = new Uint8Array(length);
    const working = new Uint8Array(stateSize);
    function restore() {
      memory.set(working, stateOffset);
    }
    function suspend() {
      working.set(memory.subarray(stateOffset, stateOffset + stateSize));
      engine.clear();
    }
    async function pause() {
      suspend();
      await yieldNow();
      restore();
    }
    function update(data, operation) {
      for (let offset = 0;offset < data.length; offset += inputCapacity) {
        const chunk = data.subarray(offset, offset + inputCapacity);
        memory.set(chunk, inputOffset);
        check(operation(chunk.length));
      }
    }
    try {
      check(engine.init(algorithm, password.length > blockSize ? 1 : 0));
      for (let offset = 0;offset < password.length; offset += SLICE) {
        if (offset > 0)
          await pause();
        update(password.subarray(offset, offset + SLICE), engine.password_update);
      }
      check(engine.password_finalize());
      for (let offset = 0;offset < salt.length; offset += SLICE) {
        if (offset > 0)
          await pause();
        update(salt.subarray(offset, offset + SLICE), engine.salt_update);
      }
      for (let index = 1, offset = 0;offset < length; index++, offset += size) {
        check(engine.derive_begin(index));
        for (let remaining = iterations - 1;remaining > 0; ) {
          const count = Math.min(remaining, PBKDF2_SLICE);
          check(engine.derive_rounds(count, 0));
          remaining -= count;
          if (remaining > 0)
            await pause();
        }
        check(engine.derive_end());
        output.set(memory.subarray(outputOffset, outputOffset + Math.min(size, length - offset)), offset);
        if (offset + size < length)
          await pause();
      }
      return output;
    } catch (error) {
      output.fill(0);
      throw error;
    } finally {
      working.fill(0);
      engine.clear();
    }
  }
  var hmacSha1 = /* @__PURE__ */ createSyncHmac("sha1", sha1Sync, 64);
  function resolveHash(name) {
    switch (name) {
      case undefined:
      case "sha256":
        return {
          name: "sha256",
          size: 32,
          mac: hmacSha256Sync
        };
      case "sha512":
        return {
          name: "sha512",
          size: 64,
          mac: hmacSha512Sync
        };
      case "sha1":
        return {
          name: "sha1",
          size: 20,
          mac: hmacSha1
        };
      default:
        throw new UnsupportedError("Unsupported KDF hash; expected sha1, sha256 or sha512");
    }
  }
  async function pbkdf2(password, salt, options) {
    if (!options || typeof options !== "object")
      throw new InvalidInputError("PBKDF2 options are required");
    const { name, size, mac } = resolveHash(options.hash);
    const { iterations, length } = options;
    if (!Number.isSafeInteger(iterations) || iterations <= 0)
      throw new InvalidInputError("PBKDF2 iterations must be a positive safe integer");
    assertLength(length);
    if (length > 4294967295 * size)
      throw new InvalidInputError("PBKDF2 output exceeds the block counter limit");
    const key = toBytes(password);
    const saltBytes = toBytes(salt);
    try {
      if (length === 0)
        return /* @__PURE__ */ new Uint8Array;
      const native = await nativePbkdf2(name, key, saltBytes, iterations, length);
      if (native !== undefined)
        return Uint8Array.from(native);
      const wasm2 = iterations > PBKDF2_SLICE || key.length + saltBytes.length > SLICE ? await pbkdf2WasmAsync(name, key, saltBytes, iterations, length) : pbkdf2Wasm(name, key, saltBytes, iterations, length);
      if (wasm2 !== undefined)
        return wasm2;
      const output = new Uint8Array(length);
      const counter = /* @__PURE__ */ new Uint8Array(4);
      const view = new DataView(counter.buffer);
      for (let index = 1, offset = 0;offset < length; index++, offset += size) {
        view.setUint32(0, index);
        let u = mac.create(key).update(saltBytes).update(counter).digest();
        const block = Uint8Array.from(u);
        for (let round = 1;round < iterations; round++) {
          const next = mac(key, u);
          u.fill(0);
          u = next;
          for (let i = 0;i < size; i++)
            block[i] ^= u[i];
          if (round % PBKDF2_SLICE === 0)
            await yieldNow();
        }
        output.set(block.subarray(0, Math.min(size, length - offset)), offset);
        block.fill(0);
        u.fill(0);
      }
      return output;
    } finally {
      key.fill(0);
    }
  }
  async function hkdf(input, options) {
    if (!options || typeof options !== "object")
      throw new InvalidInputError("HKDF options are required");
    const { name, size, mac } = resolveHash(options.hash);
    const { length } = options;
    assertLength(length);
    if (length > 255 * size)
      throw new InvalidInputError("HKDF output exceeds 255 hash blocks");
    const key = toBytes(input);
    const salt = options.salt === undefined ? new Uint8Array(size) : toBytes(options.salt);
    const info = options.info === undefined ? /* @__PURE__ */ new Uint8Array : toBytes(options.info);
    try {
      if (length === 0)
        return /* @__PURE__ */ new Uint8Array;
      const native = await nativeHkdf(name, key, salt, info, length);
      if (native !== undefined)
        return Uint8Array.from(native);
      const output = new Uint8Array(length);
      const prk = key.length > SLICE ? await macAsync(mac, salt, key) : mac(salt, key);
      let previous = /* @__PURE__ */ new Uint8Array;
      const counter = /* @__PURE__ */ new Uint8Array(1);
      try {
        for (let index = 1, offset = 0;offset < length; index++, offset += size) {
          counter[0] = index;
          const block = mac.create(prk).update(previous).update(info).update(counter).digest();
          previous.fill(0);
          previous = block;
          output.set(block.subarray(0, Math.min(size, length - offset)), offset);
        }
        return output;
      } finally {
        prk.fill(0);
        previous.fill(0);
      }
    } finally {
      key.fill(0);
    }
  }
  var kdf = {
    pbkdf2,
    hkdf
  };
  var UINT64_LIMIT = 1n << 64n;
  var SMALL_PRIMES = [
    2n,
    3n,
    5n,
    7n,
    11n,
    13n,
    17n,
    19n,
    23n,
    29n,
    31n,
    37n
  ];
  var WITNESSES_64 = [
    2n,
    325n,
    9375n,
    28178n,
    450775n,
    9780504n,
    1795265022n
  ];
  function integer(value) {
    if (typeof value !== "bigint")
      throw new InvalidInputError("Expected a bigint");
  }
  function gcd(a, b) {
    integer(a);
    integer(b);
    if (a < 0n)
      a = -a;
    if (b < 0n)
      b = -b;
    while (b !== 0n)
      [a, b] = [b, a % b];
    return a;
  }
  function modPow(base, exponent, modulus) {
    integer(base);
    integer(exponent);
    integer(modulus);
    if (exponent < 0n)
      throw new InvalidInputError("Exponent must be non-negative");
    if (modulus <= 0n)
      throw new InvalidInputError("Modulus must be positive");
    base = (base % modulus + modulus) % modulus;
    let result = 1n % modulus;
    while (exponent > 0n) {
      if (exponent & 1n)
        result = result * base % modulus;
      exponent >>= 1n;
      if (exponent > 0n)
        base = base * base % modulus;
    }
    return result;
  }
  function randomBelow(limit) {
    if (limit <= 0n)
      throw new InvalidInputError("Random integer limit must be positive");
    if (limit === 1n)
      return 0n;
    const bits = (limit - 1n).toString(2).length;
    const length = Math.ceil(bits / 8);
    const mask = 255 >>> length * 8 - bits;
    for (let attempt = 0;attempt < 128; attempt++) {
      const data = random(length);
      data[0] &= mask;
      const value = bytesToBigInt(data);
      if (value < limit)
        return value;
    }
    throw new UnsupportedError("Cryptographic random sampling failed");
  }
  function isPrime(value) {
    integer(value);
    if (value < 2n)
      return false;
    for (const prime of SMALL_PRIMES) {
      if (value === prime)
        return true;
      if (value % prime === 0n)
        return false;
    }
    let exponent = value - 1n;
    let powers = 0;
    while ((exponent & 1n) === 0n) {
      exponent >>= 1n;
      powers++;
    }
    function passes(witness) {
      witness %= value;
      if (witness < 2n)
        return true;
      let x = modPow(witness, exponent, value);
      if (x === 1n || x === value - 1n)
        return true;
      for (let i = 1;i < powers; i++) {
        x = x * x % value;
        if (x === value - 1n)
          return true;
        if (x === 1n)
          return false;
      }
      return false;
    }
    if (value < UINT64_LIMIT)
      return WITNESSES_64.every(passes);
    for (let round = 0;round < 64; round++)
      if (!passes(2n + randomBelow(value - 3n)))
        return false;
    return true;
  }
  function factors(value, divisor) {
    const other = value / divisor;
    if (!isPrime(divisor) || !isPrime(other))
      throw new InvalidInputError("Factorization requires a product of two primes");
    return divisor <= other ? {
      p: divisor,
      q: other
    } : {
      p: other,
      q: divisor
    };
  }
  function factor(value) {
    integer(value);
    if (value < 4n)
      throw new InvalidInputError("Factorization requires a semiprime");
    if (value >= UINT64_LIMIT)
      throw new UnsupportedError("Factorization supports integers below 2^64");
    for (const prime of SMALL_PRIMES)
      if (value % prime === 0n)
        return factors(value, prime);
    if (isPrime(value))
      throw new InvalidInputError("A prime has no non-trivial factors");
    let remaining = 2000000;
    for (let attempt = 1;attempt <= 32 && remaining > 0; attempt++) {
      const constant = BigInt(attempt * 2 + 1);
      let y = BigInt(attempt + 1);
      let x = y;
      let saved = y;
      let divisor = 1n;
      let span = 1;
      let work = 0;
      const step = (n) => {
        remaining--;
        work++;
        return (n * n + constant) % value;
      };
      while (divisor === 1n && remaining > 0 && work < 250000) {
        x = y;
        for (let i = 0;i < span && remaining > 0 && work < 250000; i++)
          y = step(y);
        let offset = 0;
        while (offset < span && divisor === 1n && remaining > 0 && work < 250000) {
          saved = y;
          let product = 1n;
          const batch = Math.min(64, span - offset);
          for (let i = 0;i < batch && remaining > 0 && work < 250000; i++) {
            y = step(y);
            const difference = x > y ? x - y : y - x;
            product = product * difference % value;
          }
          divisor = gcd(product, value);
          offset += batch;
        }
        span *= 2;
      }
      if (divisor === value)
        do {
          if (remaining <= 0 || work >= 250000)
            break;
          saved = step(saved);
          divisor = gcd(x > saved ? x - saved : saved - x, value);
        } while (divisor === 1n);
      if (divisor > 1n && divisor < value)
        return factors(value, divisor);
    }
    throw new UnsupportedError("Factorization exceeded its iteration budget");
  }
  var math = {
    modPow,
    gcd,
    factor,
    isPrime,
    isSafePrime(value) {
      integer(value);
      return value >= 5n && isPrime(value) && isPrime((value - 1n) / 2n);
    }
  };
  function checkKey(key) {
    if (!key || typeof key !== "object" || typeof key.n !== "bigint" || key.n < 3n || !(key.n & 1n))
      throw new InvalidKeyError("RSA modulus must be an odd positive bigint greater than two");
    const privateKey = "d" in key;
    const exponent = privateKey ? key.d : key.e;
    if (typeof exponent !== "bigint" || exponent <= 0n || exponent >= key.n || !(exponent & 1n))
      throw new InvalidKeyError("RSA exponent must be an odd positive bigint below the modulus");
    if (!privateKey && exponent < 3n)
      throw new InvalidKeyError("RSA public exponent must be at least three");
    if (privateKey && (key.p !== undefined || key.q !== undefined)) {
      const { p, q } = key;
      if (typeof p !== "bigint" || typeof q !== "bigint" || p <= 2n || q <= 2n || !(p & 1n) || !(q & 1n) || p === q || p * q !== key.n || math.gcd(p, q) !== 1n)
        throw new InvalidKeyError("RSA factors must be a distinct odd pair whose product is n");
      const lambda = (p - 1n) / math.gcd(p - 1n, q - 1n) * (q - 1n);
      if (math.gcd(exponent, lambda) !== 1n)
        throw new InvalidKeyError("RSA private exponent must be coprime to the factors’ Carmichael value");
    }
    return {
      n: key.n,
      exponent,
      length: Math.ceil(key.n.toString(2).length / 8),
      private: privateKey,
      p: privateKey ? key.p : undefined,
      q: privateKey ? key.q : undefined
    };
  }
  function operate(key, value) {
    if (!key.private) {
      const padded = bigIntToBytes(value, key.length);
      const native = nativeRsaPublic(key.n, key.exponent, padded);
      if (native !== undefined)
        return new Uint8Array(native);
      return bigIntToBytes(math.modPow(value, key.exponent, key.n), key.length);
    }
    if (key.p !== undefined && key.q !== undefined) {
      const native = nativeRsaPrivate(key.n, key.exponent, key.p, key.q, bigIntToBytes(value, key.length));
      if (native !== undefined)
        return new Uint8Array(native);
    }
    for (let attempt = 0;attempt < 128; attempt++) {
      const r = 2n + randomBelow(key.n - 2n);
      if (math.gcd(r, key.n) !== 1n)
        continue;
      const mask = math.modPow(r, key.exponent, key.n);
      return bigIntToBytes(math.modPow(value * r % key.n, key.exponent, key.n) * inverseMod(mask, key.n) % key.n, key.length);
    }
    throw new UnsupportedError("Unable to obtain an RSA blinding factor");
  }
  async function raw(key, data) {
    const checked = checkKey(key);
    const input = toBinary(data);
    if (input.length > checked.length)
      throw new InvalidInputError("RSA input exceeds the modulus length");
    const value = bytesToBigInt(input);
    if (value >= checked.n)
      throw new InvalidInputError("RSA representative must be below the modulus");
    return operate(checked, value);
  }
  function mgf1(hash, seed, length) {
    const output = new Uint8Array(length);
    const input = new Uint8Array(seed.length + 4);
    input.set(seed);
    const counter = new DataView(input.buffer, seed.length, 4);
    let offset = 0;
    for (let i = 0;offset < length; i++) {
      counter.setUint32(0, i, false);
      const block = hash(input);
      const count = Math.min(block.length, length - offset);
      output.set(block.subarray(0, count), offset);
      offset += count;
    }
    return output;
  }
  function xorInto(target, mask) {
    for (let i = 0;i < target.length; i++)
      target[i] ^= mask[i];
  }
  function oaep(key, options = {}) {
    const checked = checkKey(key);
    if (!options || typeof options !== "object")
      throw new InvalidInputError("Invalid RSA-OAEP options");
    const name = options.hash === undefined ? "sha256" : options.hash;
    let hash;
    let hLength;
    switch (name) {
      case "sha1":
        hash = sha1Sync;
        hLength = 20;
        break;
      case "sha256":
        hash = sha256Sync;
        hLength = 32;
        break;
      case "sha512":
        hash = sha512Sync;
        hLength = 64;
        break;
      default:
        throw new UnsupportedError("Unsupported RSA-OAEP hash");
    }
    const label = options.label === undefined ? /* @__PURE__ */ new Uint8Array(0) : toBytes(options.label);
    const length = checked.length;
    if (length < 2 * hLength + 2)
      throw new InvalidKeyError("RSA modulus is too short for the chosen OAEP hash");
    const native = nativeOaep(checked.private ? {
      n: checked.n,
      d: checked.exponent,
      p: checked.p,
      q: checked.q
    } : {
      n: checked.n,
      e: checked.exponent
    }, name, label);
    let labelHash;
    return {
      async encrypt(data) {
        if (checked.private)
          throw new InvalidKeyError("RSA-OAEP encryption requires a public key");
        const message = toBytes(data);
        if (message.length > length - 2 * hLength - 2)
          throw new InvalidInputError("Message is too long for the RSA-OAEP modulus and hash");
        const result = await native.encrypt(message);
        if (result !== undefined)
          return Uint8Array.from(result);
        const encoded = new Uint8Array(length);
        const seed = encoded.subarray(1, 1 + hLength);
        const db = encoded.subarray(1 + hLength);
        db.set(labelHash ?? (labelHash = hash(label)));
        db[db.length - message.length - 1] = 1;
        db.set(message, db.length - message.length);
        seed.set(random(hLength));
        xorInto(db, mgf1(hash, seed, db.length));
        xorInto(seed, mgf1(hash, db, hLength));
        return operate(checked, bytesToBigInt(encoded));
      },
      async decrypt(data) {
        if (!checked.private)
          throw new InvalidKeyError("RSA-OAEP decryption requires a private key");
        const ciphertext = toBinary(data);
        if (ciphertext.length !== length)
          throw new AuthenticationError("RSA-OAEP decryption failed");
        const value = bytesToBigInt(ciphertext);
        if (value >= checked.n)
          throw new AuthenticationError("RSA-OAEP decryption failed");
        const result = await native.decrypt(ciphertext);
        if (result !== undefined)
          return Uint8Array.from(result);
        const encoded = operate(checked, value);
        const seed = encoded.subarray(1, 1 + hLength);
        const db = encoded.subarray(1 + hLength);
        xorInto(seed, mgf1(hash, db, hLength));
        xorInto(db, mgf1(hash, seed, db.length));
        let invalid = encoded[0];
        const digest = labelHash ?? (labelHash = hash(label));
        for (let i = 0;i < hLength; i++)
          invalid |= db[i] ^ digest[i];
        let looking = 1;
        let start = 0;
        for (let i = hLength;i < db.length; i++) {
          const zero = Number(db[i] === 0);
          const one = Number(db[i] === 1);
          invalid |= looking & 1 - zero & 1 - one;
          const separator = looking & one;
          start += separator * (i + 1 - start);
          looking &= 1 - one;
        }
        invalid |= looking;
        if (invalid !== 0)
          throw new AuthenticationError("RSA-OAEP decryption failed");
        return db.slice(start);
      }
    };
  }
  var rsa = {
    raw,
    oaep
  };
  var cifrante_default = {
    random,
    bytes,
    md5,
    sha1,
    sha256,
    sha512,
    aes,
    hmac,
    kdf,
    math,
    rsa,
    CifranteError,
    InvalidInputError,
    UnsupportedError,
    InvalidKeyError,
    InvalidIVError,
    InvalidNonceError,
    AuthenticationError
  };
  exports2.AuthenticationError = AuthenticationError;
  exports2.CifranteError = CifranteError;
  exports2.InvalidIVError = InvalidIVError;
  exports2.InvalidInputError = InvalidInputError;
  exports2.InvalidKeyError = InvalidKeyError;
  exports2.InvalidNonceError = InvalidNonceError;
  exports2.UnsupportedError = UnsupportedError;
  exports2.aes = aes;
  exports2.bytes = bytes;
  exports2.default = cifrante_default;
  exports2.hmac = hmac;
  exports2.kdf = kdf;
  exports2.math = math;
  exports2.md5 = md5;
  exports2.random = random;
  exports2.rsa = rsa;
  exports2.sha1 = sha1;
  exports2.sha256 = sha256;
  exports2.sha512 = sha512;
});

// node_modules/teleproto/Helpers.js
var require_Helpers = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod2) {
    return mod2 && mod2.__esModule ? mod2 : { default: mod2 };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2._EntityType = exports2.TotalList = exports2.sleep = exports2.isArrayLike = undefined;
  exports2.asBuffer = asBuffer;
  exports2.readBigIntFromBuffer = readBigIntFromBuffer;
  exports2.escapeRegex = escapeRegex;
  exports2.groupBy = groupBy;
  exports2.betterConsoleLog = betterConsoleLog;
  exports2.toSignedLittleBuffer = toSignedLittleBuffer;
  exports2.readBufferFromBigInt = readBufferFromBigInt;
  exports2.generateRandomLong = generateRandomLong;
  exports2.generateRandomBigInt = generateRandomBigInt;
  exports2.mod = mod;
  exports2.bigIntMod = bigIntMod;
  exports2.generateRandomBytes = generateRandomBytes;
  exports2.stripText = stripText;
  exports2.generateKeyDataFromNonce = generateKeyDataFromNonce;
  exports2.convertToLittle = convertToLittle;
  exports2.sha1 = sha1;
  exports2.sha256 = sha256;
  exports2.modExp = modExp;
  exports2.getByteArray = getByteArray;
  exports2.returnBigInt = returnBigInt;
  exports2.getMinBigInt = getMinBigInt;
  exports2.getRandomInt = getRandomInt;
  exports2.bufferXor = bufferXor;
  exports2.crc32 = crc32;
  exports2.unionId = unionId;
  exports2._entityType = _entityType;
  var big_integer_1 = __importDefault(require_BigInteger());
  var crypto_1 = __importDefault(require("crypto"));
  var node_zlib_1 = __importDefault(require("node:zlib"));
  var cifrante_1 = require_cifrante_node();
  function asBuffer(bytes) {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  function readBigIntFromBuffer(buffer, little = true, signed = false) {
    if (!Buffer.isBuffer(buffer)) {
      const view = buffer;
      buffer = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
    }
    if (buffer.length === 8) {
      return (0, big_integer_1.default)(little ? signed ? buffer.readBigInt64LE(0) : buffer.readBigUInt64LE(0) : signed ? buffer.readBigInt64BE(0) : buffer.readBigUInt64BE(0));
    }
    let count8b = buffer.length / 8 | 0;
    let bytesLeft = buffer.length - count8b * 8;
    const bi64 = BigInt(64);
    let resBigInt = BigInt(0);
    let i = count8b;
    while (i > 0) {
      let bi = little ? buffer.readBigUInt64LE(buffer.length - (count8b - i + 1) * 8) : buffer.readBigUint64BE((count8b - i) * 8);
      resBigInt = bi + (resBigInt << bi64);
      --i;
    }
    const resBitLength = 8 * buffer.length;
    if (bytesLeft) {
      if (buffer.length < 8) {
        let buf8b = Buffer.allocUnsafe(8);
        let writeIdx = little ? 0 : 8 - bytesLeft;
        buffer.copy(buf8b, writeIdx, 0, bytesLeft);
        buffer = buf8b;
      }
      let bi = little ? buffer.readBigUInt64LE(0) : buffer.readBigUint64BE(buffer.length - 8);
      bi = BigInt.asUintN(8 * bytesLeft, bi);
      resBigInt = bi + (resBigInt << BigInt(8 * bytesLeft));
    }
    if (signed) {
      resBigInt = BigInt.asIntN(resBitLength, resBigInt);
    }
    return (0, big_integer_1.default)(resBigInt);
  }
  function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  }
  function groupBy(list, keyGetter) {
    const map = new Map;
    list.forEach((item) => {
      const key = keyGetter(item);
      const collection = map.get(key);
      if (!collection) {
        map.set(key, [item]);
      } else {
        collection.push(item);
      }
    });
    return map;
  }
  function betterConsoleLog(object) {
    const toPrint = {};
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        if (!key.startsWith("_") && key != "originalArgs") {
          toPrint[key] = object[key];
        }
      }
    }
    return toPrint;
  }
  var isArrayLike = (x) => x && typeof x.length === "number" && typeof x !== "function" && typeof x !== "string";
  exports2.isArrayLike = isArrayLike;
  function toNativeBigInt(value) {
    if (typeof value === "bigint") {
      return value;
    }
    if (typeof value === "number") {
      return BigInt(value);
    }
    const wrapped = returnBigInt(value);
    return typeof wrapped.value === "bigint" ? wrapped.value : BigInt(String(wrapped));
  }
  function bitLengthOf(value) {
    let bits = 0;
    while (value > BigInt(4294967295)) {
      value >>= BigInt(32);
      bits += 32;
    }
    return bits + (32 - Math.clz32(Number(value)));
  }
  function writeUnsignedLE(buffer, value, offset, length) {
    let rest = value;
    for (let done = 0;done < length; ) {
      const count = Math.min(8, length - done);
      if (count === 8) {
        buffer.writeBigUInt64LE(BigInt.asUintN(64, rest), offset + done);
      } else {
        for (let i = 0;i < count; i++) {
          buffer[offset + done + i] = Number(BigInt.asUintN(8, rest >> BigInt(8 * i)));
        }
      }
      rest >>= BigInt(8 * count);
      done += count;
    }
  }
  function toSignedLittleBuffer(big, number = 8) {
    const buffer = Buffer.allocUnsafe(number);
    writeUnsignedLE(buffer, BigInt.asUintN(number * 8, toNativeBigInt(big)), 0, number);
    return buffer;
  }
  function readBufferFromBigInt(bigIntVar, bytesNumber, little = true, signed = false) {
    const value = toNativeBigInt(bigIntVar);
    const bits = bytesNumber * 8;
    const negative = value < BigInt(0);
    const magnitude = negative ? -value - BigInt(1) : value;
    if (bytesNumber < Math.ceil(bitLengthOf(magnitude) / 8)) {
      throw new Error("OverflowError: int too big to convert");
    }
    if (!signed && negative) {
      throw new Error("Cannot convert to unsigned");
    }
    const buffer = Buffer.allocUnsafe(bytesNumber);
    writeUnsignedLE(buffer, BigInt.asUintN(bits, value), 0, bytesNumber);
    return little ? buffer : buffer.reverse();
  }
  function generateRandomLong(signed = true) {
    return readBigIntFromBuffer(generateRandomBytes(8), true, signed);
  }
  function generateRandomBigInt() {
    return generateRandomLong(false);
  }
  function mod(n, m) {
    return (n % m + m) % m;
  }
  function bigIntMod(n, m) {
    return n.remainder(m).add(m).remainder(m);
  }
  function generateRandomBytes(count) {
    return crypto_1.default.randomBytes(count);
  }
  function stripText(text, entities) {
    if (!entities || !entities.length) {
      return text.trim();
    }
    while (text && text[text.length - 1].trim() === "") {
      const e = entities[entities.length - 1];
      if (e.offset + e.length == text.length) {
        if (e.length == 1) {
          entities.pop();
          if (!entities.length) {
            return text.trim();
          }
        } else {
          e.length -= 1;
        }
      }
      text = text.slice(0, -1);
    }
    while (text && text[0].trim() === "") {
      for (let i = 0;i < entities.length; i++) {
        const e = entities[i];
        if (e.offset != 0) {
          e.offset--;
          continue;
        }
        if (e.length == 1) {
          entities.shift();
          if (!entities.length) {
            return text.trimLeft();
          }
        } else {
          e.length -= 1;
        }
      }
      text = text.slice(1);
    }
    return text;
  }
  async function generateKeyDataFromNonce(serverNonceBigInt, newNonceBigInt) {
    const serverNonce = toSignedLittleBuffer(serverNonceBigInt, 16);
    const newNonce = toSignedLittleBuffer(newNonceBigInt, 32);
    const [hash1, hash2, hash3] = await Promise.all([
      sha1(Buffer.concat([newNonce, serverNonce])),
      sha1(Buffer.concat([serverNonce, newNonce])),
      sha1(Buffer.concat([newNonce, newNonce]))
    ]);
    const keyBuffer = Buffer.concat([hash1, hash2.slice(0, 12)]);
    const ivBuffer = Buffer.concat([
      hash2.slice(12, 20),
      hash3,
      newNonce.slice(0, 4)
    ]);
    return {
      key: keyBuffer,
      iv: ivBuffer
    };
  }
  function convertToLittle(buf) {
    const correct = Buffer.alloc(buf.length * 4);
    for (let i = 0;i < buf.length; i++) {
      correct.writeUInt32BE(buf[i], i * 4);
    }
    return correct;
  }
  function sha1(data) {
    return asBuffer(cifrante_1.sha1.sync(data));
  }
  function sha256(data) {
    return asBuffer(cifrante_1.sha256.sync(data));
  }
  function modExp(a, b, n) {
    if (b.lesserOrEquals(big_integer_1.default.zero)) {
      return big_integer_1.default.one;
    }
    return (0, big_integer_1.default)(cifrante_1.math.modPow(BigInt(a.toString()), BigInt(b.toString()), BigInt(n.toString())).toString());
  }
  function getByteArray(integer, signed = false) {
    const bits = integer.toString(2).length;
    const byteLength = Math.floor((bits + 8 - 1) / 8);
    return readBufferFromBigInt(typeof integer == "number" ? (0, big_integer_1.default)(integer) : integer, byteLength, false, signed);
  }
  function returnBigInt(num) {
    if (big_integer_1.default.isInstance(num)) {
      return num;
    }
    if (typeof num == "number") {
      return (0, big_integer_1.default)(num);
    }
    if (typeof num == "bigint") {
      return (0, big_integer_1.default)(num);
    }
    return (0, big_integer_1.default)(num);
  }
  function getMinBigInt(arrayOfBigInts) {
    if (arrayOfBigInts.length == 0) {
      return big_integer_1.default.zero;
    }
    if (arrayOfBigInts.length == 1) {
      return returnBigInt(arrayOfBigInts[0]);
    }
    let smallest = returnBigInt(arrayOfBigInts[0]);
    for (let i = 1;i < arrayOfBigInts.length; i++) {
      if (returnBigInt(arrayOfBigInts[i]).lesser(smallest)) {
        smallest = returnBigInt(arrayOfBigInts[i]);
      }
    }
    return smallest;
  }
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  var sleep = (ms, isUnref = false) => new Promise((resolve) => isUnref ? setTimeout(resolve, ms).unref() : setTimeout(resolve, ms));
  exports2.sleep = sleep;
  function bufferXor(a, b) {
    const res = [];
    for (let i = 0;i < a.length; i++) {
      res.push(a[i] ^ b[i]);
    }
    return Buffer.from(res);
  }
  function makeCRCTable() {
    let c;
    const crcTable2 = [];
    for (let n = 0;n < 256; n++) {
      c = n;
      for (let k = 0;k < 8; k++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      crcTable2[n] = c;
    }
    return crcTable2;
  }
  var crcTable = undefined;
  var nativeCrc32 = node_zlib_1.default.crc32;
  function crc32(buf, previous = 0) {
    if (nativeCrc32) {
      return nativeCrc32(buf, previous) >>> 0;
    }
    if (!crcTable) {
      crcTable = makeCRCTable();
    }
    if (!Buffer.isBuffer(buf)) {
      buf = Buffer.from(buf);
    }
    let crc = previous ^ -1;
    for (let index = 0;index < buf.length; index++) {
      const byte = buf[index];
      crc = crcTable[(crc ^ byte) & 255] ^ crc >>> 8;
    }
    return (crc ^ -1) >>> 0;
  }
  var unionIdCache = new Map;
  function unionId(name) {
    let id = unionIdCache.get(name);
    if (id === undefined) {
      id = crc32(name) >>> 0;
      unionIdCache.set(name, id);
    }
    return id;
  }

  class TotalList extends Array {
    constructor() {
      super();
      this.total = 0;
    }
  }
  exports2.TotalList = TotalList;
  exports2._EntityType = {
    USER: 0,
    CHAT: 1,
    CHANNEL: 2
  };
  Object.freeze(exports2._EntityType);
  function _entityType(entity) {
    if (typeof entity !== "object" || !("SUBCLASS_OF_ID" in entity)) {
      throw new Error(`${entity} is not a TLObject, cannot determine entity type`);
    }
    if (![
      unionId("Peer"),
      unionId("InputPeer"),
      unionId("InputUser"),
      unionId("InputChannel"),
      unionId("User"),
      unionId("Chat"),
      unionId("UserFull"),
      unionId("ChatFull")
    ].includes(entity.SUBCLASS_OF_ID)) {
      throw new Error(`${entity} does not have any entity type`);
    }
    const name = entity.className;
    if (name.includes("User")) {
      return exports2._EntityType.USER;
    } else if (name.includes("Chat")) {
      return exports2._EntityType.CHAT;
    } else if (name.includes("Channel") || name.includes("Community")) {
      return exports2._EntityType.CHANNEL;
    } else if (name.includes("Self")) {
      return exports2._EntityType.USER;
    }
    throw new Error(`${entity} does not have any entity type`);
  }
});

// node_modules/teleproto/tl/runtime/helpers.js
var require_helpers = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.serializeBytes = serializeBytes;
  exports2.serializeDate = serializeDate;
  function serializeBytes(data) {
    if (!(data instanceof Buffer)) {
      if (typeof data === "string") {
        data = Buffer.from(data);
      } else {
        throw new Error(`Bytes or str expected, not ${typeof data}`);
      }
    }
    const length = data.length;
    const head = length < 254 ? 1 : 4;
    const padding = (4 - (head + length) % 4) % 4;
    const out = Buffer.allocUnsafe(head + length + padding);
    if (head === 1) {
      out[0] = length;
    } else {
      out[0] = 254;
      out[1] = length & 255;
      out[2] = length >> 8 & 255;
      out[3] = length >> 16 & 255;
    }
    data.copy(out, head);
    out.fill(0, head + length);
    return out;
  }
  function serializeDate(dt) {
    if (!dt) {
      return Buffer.alloc(4).fill(0);
    }
    if (dt instanceof Date) {
      dt = Math.floor((Date.now() - dt.getTime()) / 1000);
    }
    if (typeof dt === "number") {
      const buffer = Buffer.alloc(4);
      buffer.writeInt32LE(dt, 0);
      return buffer;
    }
    throw new Error(`Cannot interpret "${String(dt)}" as a date`);
  }
});

// node_modules/teleproto/tl/runtime/createApi.js
var require_createApi = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.createApiFromDefinitions = createApiFromDefinitions;
  var big_integer_1 = __importDefault(require_BigInteger());
  var Helpers_1 = require_Helpers();
  var helpers_1 = require_helpers();
  var INSPECT_CUSTOM = Symbol.for("nodejs.util.inspect.custom");
  function lowerFirst(value) {
    return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
  }
  var NAMED_AUTO_CASTS = new Set(["chatId,int"]);
  var AUTO_CASTS = new Set([
    "InputPeer",
    "InputChannel",
    "InputUser",
    "InputDialogPeer",
    "InputNotifyPeer",
    "InputMedia",
    "InputPhoto",
    "InputMessage",
    "InputDocument",
    "InputChatPhoto"
  ]);
  function isFlagFieldAbsent(cfg, value) {
    return value === false && cfg.type !== "Bool" || value === null || value === undefined;
  }
  function isBitSetBySibling(arg, argsConfig, instance) {
    const self = argsConfig[arg];
    const values = instance;
    for (const other in argsConfig) {
      const cfg = argsConfig[other];
      if (other !== arg && cfg.isFlag && cfg.type !== "true" && cfg.flagName === self.flagName && cfg.flagIndex === self.flagIndex && !isFlagFieldAbsent(cfg, values[other])) {
        return true;
      }
    }
    return false;
  }
  function emptyFlagValue(cfg) {
    if (cfg.isVector)
      return [];
    const type = cfg.type ?? "";
    if (type === "string")
      return "";
    if (type === "bytes")
      return Buffer.alloc(0);
    if (type === "int" || type === "long" || type === "double")
      return 0;
    throw new Error(`Cannot co-serialize flag field of type "${type}": a sibling on the same flag bit is set but this field is missing and has no empty form`);
  }
  function argToBytes(value, type, argName, requestName) {
    if (value == null) {
      switch (type) {
        case "int":
        case "long":
        case "int128":
        case "int256":
        case "double":
        case "date":
          value = 0;
          break;
        case "true":
        case "Bool":
          break;
        default:
          throw new Error(`Required field "${argName}" of ${requestName || "request"} is missing`);
      }
    }
    switch (type) {
      case "int": {
        const intBuffer = Buffer.alloc(4);
        intBuffer.writeInt32LE(value, 0);
        return intBuffer;
      }
      case "long":
        return (0, Helpers_1.toSignedLittleBuffer)(value, 8);
      case "int128":
        return (0, Helpers_1.toSignedLittleBuffer)(value, 16);
      case "int256":
        return (0, Helpers_1.toSignedLittleBuffer)(value, 32);
      case "double": {
        const doubleBuffer = Buffer.alloc(8);
        doubleBuffer.writeDoubleLE(value, 0);
        return doubleBuffer;
      }
      case "string":
        return (0, helpers_1.serializeBytes)(value);
      case "Bool":
        return value ? Buffer.from("b5757299", "hex") : Buffer.from("379779bc", "hex");
      case "true":
        return Buffer.alloc(0);
      case "bytes":
        return (0, helpers_1.serializeBytes)(value);
      case "date":
        return (0, helpers_1.serializeDate)(value);
      default: {
        const objectValue = value;
        if (!objectValue || typeof objectValue.getBytes !== "function") {
          throw new Error(`Required object ${argName} of ${requestName || "request"} is undefined`);
        }
        return objectValue.getBytes();
      }
    }
  }
  async function getInputFromResolve(utils, client, peer, peerType) {
    switch (peerType) {
      case "InputPeer":
        return utils.getInputPeer(await client.getInputEntity(peer));
      case "InputChannel":
        return utils.getInputChannel(await client.getInputEntity(peer));
      case "InputUser":
        return utils.getInputUser(await client.getInputEntity(peer));
      case "InputDialogPeer":
        return client._getInputDialog(peer);
      case "InputNotifyPeer":
        return client._getInputNotify(peer);
      case "InputMedia":
        return utils.getInputMedia(peer);
      case "InputPhoto":
        return utils.getInputPhoto(peer);
      case "InputMessage":
        return utils.getInputMessage(peer);
      case "InputDocument":
        return utils.getInputDocument(peer);
      case "InputChatPhoto":
        return utils.getInputChatPhoto(peer);
      case "chatId,int":
        return client.getPeerId(peer, false);
      default:
        throw new Error("unsupported peer type : " + peerType);
    }
  }
  function createArgFromReader(getApi) {
    return function getArgFromReader(reader, arg) {
      if (arg.isVector) {
        if (arg.useVectorId) {
          reader.readInt();
        }
        const values = [];
        const len = reader.readInt();
        arg.isVector = false;
        for (let i = 0;i < len; i += 1) {
          values.push(getArgFromReader(reader, arg));
        }
        arg.isVector = true;
        return values;
      }
      if (arg.flagIndicator) {
        return reader.readInt();
      }
      switch (arg.type) {
        case "int":
          return reader.readInt();
        case "long":
          return reader.readLong();
        case "int128":
          return reader.readLargeInt(128);
        case "int256":
          return reader.readLargeInt(256);
        case "double":
          return reader.readDouble();
        case "string":
          return reader.tgReadString();
        case "Bool":
          return reader.tgReadBool();
        case "true":
          return true;
        case "bytes":
          return reader.tgReadBytes();
        case "date":
          return reader.tgReadDate();
        default: {
          if (!arg.skipConstructorId) {
            return reader.tgReadObject();
          }
          const api = getApi();
          return api.constructors[arg.type].fromReader(reader);
        }
      }
    };
  }
  function createClasses(params, helpers) {
    const classes = {};
    const { getArgFromReader } = helpers;
    const byTag = new Map;
    const resolvers = new Map;
    const byResult = new Map;
    function coerce(value, expectedType) {
      if (!value || typeof value !== "object" || Array.isArray(value) || big_integer_1.default.isInstance(value) || typeof value.getBytes === "function") {
        return value;
      }
      let Cls;
      const tag = value._;
      if (tag) {
        Cls = byTag.get(tag);
        if (!Cls) {
          throw new Error(`Unknown TL "_" tag: ${JSON.stringify(tag)}`);
        }
      } else if (expectedType) {
        const candidates = byResult.get(expectedType);
        if (candidates && candidates.length === 1) {
          Cls = candidates[0];
        } else if (candidates && candidates.length > 1) {
          throw new Error(`Ambiguous type "${expectedType}" — add "_" to pick a constructor ` + `(one of: ${candidates.map((c) => c.className).join(", ")})`);
        }
      }
      return Cls ? new Cls(value) : value;
    }
    for (const classParams of params) {
      const { name, constructorId, subclassOfId, argsConfig, namespace, isFunction, result } = classParams;
      const fullName = [namespace, name].join(".").replace(/^\./, "");

      class VirtualClass {
        static {
          this.CONSTRUCTOR_ID = constructorId;
        }
        static {
          this.SUBCLASS_OF_ID = subclassOfId;
        }
        static {
          this.className = fullName;
        }
        static {
          this.hasParameters = Object.values(argsConfig).some((arg) => !arg.flagIndicator);
        }
        static {
          this.classType = isFunction ? "request" : "constructor";
        }
        constructor(args) {
          this.CONSTRUCTOR_ID = constructorId;
          this.SUBCLASS_OF_ID = subclassOfId;
          this.className = fullName;
          this.classType = isFunction ? "request" : "constructor";
          this.originalArgs = {};
          args = args || {};
          this.originalArgs = args;
          this.init(args);
          for (const argName in argsConfig) {
            if (argName === "randomId" && !args[argName]) {
              if (argsConfig[argName].isVector) {
                const randomIds = [];
                const baseIds = args.id || [];
                for (let i = 0;i < baseIds.length; i += 1) {
                  randomIds.push((0, Helpers_1.generateRandomLong)(true));
                }
                this[argName] = randomIds;
              } else {
                this[argName] = (0, Helpers_1.generateRandomLong)(true);
              }
            } else {
              this[argName] = args[argName];
            }
          }
        }
        init(_args) {}
        static fromReader(reader) {
          const args = {};
          for (const argName in argsConfig) {
            if (!Object.prototype.hasOwnProperty.call(argsConfig, argName)) {
              continue;
            }
            const arg = argsConfig[argName];
            if (arg.isFlag) {
              if (arg.type === "true") {
                args[argName] = Boolean(args[arg.flagName] & 1 << arg.flagIndex);
                continue;
              }
              if (args[arg.flagName] & 1 << arg.flagIndex) {
                args[argName] = getArgFromReader(reader, arg);
              } else {
                args[argName] = null;
              }
            } else {
              if (arg.flagIndicator) {
                arg.name = argName;
              }
              args[argName] = getArgFromReader(reader, arg);
            }
          }
          return new this(args);
        }
        _coerceArgs() {
          for (const arg in argsConfig) {
            if (!Object.prototype.hasOwnProperty.call(argsConfig, arg)) {
              continue;
            }
            const cfg = argsConfig[arg];
            if (cfg.flagIndicator) {
              continue;
            }
            const value = this[arg];
            if (value != null && ["long", "int128", "int256"].includes(cfg.type ?? "")) {
              this[arg] = cfg.isVector ? value.map(Helpers_1.returnBigInt) : (0, Helpers_1.returnBigInt)(value);
              continue;
            }
            if (!value || typeof value !== "object") {
              continue;
            }
            if (cfg.isVector) {
              if (Array.isArray(value)) {
                this[arg] = value.map((item) => coerce(item, cfg.type));
              }
            } else if (typeof value.getBytes !== "function") {
              this[arg] = coerce(value, cfg.type);
            }
          }
        }
        getBytes() {
          this._coerceArgs();
          const constructorBuffer = Buffer.alloc(4);
          constructorBuffer.writeUInt32LE(this.CONSTRUCTOR_ID, 0);
          const buffers = [constructorBuffer];
          for (const arg in argsConfig) {
            if (!Object.prototype.hasOwnProperty.call(argsConfig, arg)) {
              continue;
            }
            let argValue = this[arg];
            if (argsConfig[arg].isFlag) {
              if (argsConfig[arg].type === "true") {
                continue;
              }
              if (isFlagFieldAbsent(argsConfig[arg], argValue)) {
                if (isBitSetBySibling(arg, argsConfig, this)) {
                  argValue = emptyFlagValue(argsConfig[arg]);
                } else {
                  continue;
                }
              }
            }
            if (argsConfig[arg].isVector) {
              if (argsConfig[arg].useVectorId) {
                buffers.push(Buffer.from("15c4b51c", "hex"));
              }
              const list = argValue || [];
              const lengthBuffer = Buffer.alloc(4);
              lengthBuffer.writeInt32LE(list.length, 0);
              buffers.push(lengthBuffer, Buffer.concat(list.map((item) => argToBytes(item, argsConfig[arg].type, arg, fullName))));
              continue;
            }
            if (argsConfig[arg].flagIndicator) {
              if (!Object.values(argsConfig).some((f) => f.isFlag)) {
                buffers.push(Buffer.alloc(4));
                continue;
              }
              let flagValue = 0;
              for (const flagArg in argsConfig) {
                if (argsConfig[flagArg].isFlag && arg === argsConfig[flagArg].flagName) {
                  const currentValue = this[flagArg];
                  if (!isFlagFieldAbsent(argsConfig[flagArg], currentValue)) {
                    flagValue |= 1 << argsConfig[flagArg].flagIndex;
                  }
                }
              }
              const flagBuffer = Buffer.alloc(4);
              flagBuffer.writeUInt32LE(flagValue, 0);
              buffers.push(flagBuffer);
              continue;
            }
            const serializedArg = argToBytes(argValue, argsConfig[arg].type, arg, fullName);
            buffers.push(serializedArg);
            const objectArg = argValue;
            if (objectArg && typeof objectArg.getBytes === "function") {
              let boxed = argsConfig[arg].type?.charAt(argsConfig[arg].type.indexOf(".") + 1);
              boxed = boxed === boxed?.toUpperCase() ? boxed : "";
              if (!boxed) {
                buffers.shift();
              }
            }
          }
          return Buffer.concat(buffers);
        }
        readResult(reader) {
          if (!isFunction) {
            throw new Error("`readResult()` called for non-request instance");
          }
          if (result === "X") {
            this._coerceArgs();
            const query = this.query;
            if (typeof query?.readResult !== "function")
              throw new TypeError("query must be a TL request");
            return query.readResult(reader);
          }
          const match = result.match(/Vector<(int|long)>/);
          if (match) {
            reader.readInt();
            const values = [];
            const len = reader.readInt();
            if (match[1] === "int") {
              for (let i = 0;i < len; i += 1) {
                values.push(reader.readInt());
              }
            } else {
              for (let i = 0;i < len; i += 1) {
                values.push(reader.readLong());
              }
            }
            return values;
          }
          return reader.tgReadObject();
        }
        async resolve(client, utils) {
          if (!isFunction) {
            throw new Error("`resolve()` called for non-request instance");
          }
          await resolvers.get(VirtualClass)(this, client, utils, new Set);
        }
        toJSON() {
          return { ...this.originalArgs, className: fullName };
        }
      }
      resolvers.set(VirtualClass, async (value, client, utils, seen) => {
        if (seen.has(value))
          return;
        seen.add(value);
        value._coerceArgs();
        for (const [arg, cfg] of Object.entries(argsConfig)) {
          if (cfg.flagIndicator || value[arg] == null)
            continue;
          if (!AUTO_CASTS.has(cfg.type ?? "") && cfg.type !== "X" && !byResult.has(cfg.type ?? "") && !NAMED_AUTO_CASTS.has(`${arg},${cfg.type}`))
            continue;
          const resolveValue = async (item) => {
            if (item && typeof item === "object") {
              const resolve = resolvers.get(item.constructor);
              if (resolve)
                await resolve(item, client, utils, seen);
            }
            const cast = NAMED_AUTO_CASTS.has(`${arg},${cfg.type}`) ? `${arg},${cfg.type}` : cfg.type;
            return AUTO_CASTS.has(cast) || NAMED_AUTO_CASTS.has(cast) ? getInputFromResolve(utils, client, item, cast) : item;
          };
          if (cfg.isVector && Array.isArray(value[arg])) {
            const resolved = [];
            for (const item of value[arg])
              resolved.push(await resolveValue(item));
            value[arg] = resolved;
          } else {
            value[arg] = await resolveValue(value[arg]);
          }
        }
      });
      Object.defineProperty(VirtualClass, "name", {
        value: fullName,
        configurable: true
      });
      const tag = namespace ? `${namespace}.${lowerFirst(name)}` : lowerFirst(name);
      byTag.set(tag, VirtualClass);
      const sameResult = byResult.get(result);
      if (sameResult) {
        sameResult.push(VirtualClass);
      } else {
        byResult.set(result, [VirtualClass]);
      }
      VirtualClass.prototype[INSPECT_CUSTOM] = function(_depth, options, inspect) {
        const view = {};
        for (const argName in argsConfig) {
          const value = this[argName];
          if (value === null || value === undefined)
            continue;
          view[argName] = value;
        }
        const render = inspect || ((value) => JSON.stringify(value));
        return `${fullName} ${render(view, options)}`;
      };
      if (namespace) {
        if (!classes[namespace]) {
          classes[namespace] = {};
        }
        classes[namespace][name] = VirtualClass;
      } else {
        classes[name] = VirtualClass;
      }
    }
    return classes;
  }
  function createApiFromDefinitions(definitions) {
    let api;
    const getArgFromReader = createArgFromReader(() => api);
    api = createClasses(definitions, { getArgFromReader });
    return api;
  }
});

// node_modules/teleproto/tl/generated/api-definitions.js
var require_api_definitions = __commonJS((exports2, module2) => {
  module2.exports = [
    { name: "InputPeerEmpty", constructorId: 2134579434, argsConfig: {}, subclassOfId: 3374092470, result: "InputPeer", isFunction: false },
    { name: "InputPeerSelf", constructorId: 2107670217, argsConfig: {}, subclassOfId: 3374092470, result: "InputPeer", isFunction: false },
    { name: "InputPeerChat", constructorId: 900291769, argsConfig: { chatId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 3374092470, result: "InputPeer", isFunction: false },
    { name: "InputPeerUser", constructorId: 3723011404, argsConfig: { userId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 3374092470, result: "InputPeer", isFunction: false },
    { name: "InputPeerChannel", constructorId: 666680316, argsConfig: { channelId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 3374092470, result: "InputPeer", isFunction: false },
    { name: "InputPeerUserFromMessage", constructorId: 2826635804, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, userId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 3374092470, result: "InputPeer", isFunction: false },
    { name: "InputPeerChannelFromMessage", constructorId: 3173648448, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, channelId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 3374092470, result: "InputPeer", isFunction: false },
    { name: "InputUserEmpty", constructorId: 3112732367, argsConfig: {}, subclassOfId: 3865689926, result: "InputUser", isFunction: false },
    { name: "InputUserSelf", constructorId: 4156666175, argsConfig: {}, subclassOfId: 3865689926, result: "InputUser", isFunction: false },
    { name: "InputUser", constructorId: 4061223110, argsConfig: { userId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 3865689926, result: "InputUser", isFunction: false },
    { name: "InputUserFromMessage", constructorId: 497305826, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, userId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 3865689926, result: "InputUser", isFunction: false },
    { name: "InputPhoneContact", constructorId: 1780335806, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, clientId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, phone: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, firstName: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, lastName: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, note: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "TextWithEntities", useVectorId: null } }, subclassOfId: 2926144130, result: "InputContact", isFunction: false },
    { name: "InputFile", constructorId: 4113560191, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, parts: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, name: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, md5Checksum: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 3882180383, result: "InputFile", isFunction: false },
    { name: "InputFileBig", constructorId: 4199484341, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, parts: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, name: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 3882180383, result: "InputFile", isFunction: false },
    { name: "InputFileStoryDocument", constructorId: 1658620744, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputDocument", useVectorId: null } }, subclassOfId: 3882180383, result: "InputFile", isFunction: false },
    { name: "InputMediaEmpty", constructorId: 2523198847, argsConfig: {}, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaUploadedPhoto", constructorId: 2105767386, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, spoiler: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, livePhoto: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "true", useVectorId: null }, file: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputFile", useVectorId: null }, stickers: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "InputDocument", useVectorId: true }, ttlSeconds: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "int", useVectorId: null }, video: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "InputDocument", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaPhoto", constructorId: 3819914292, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, spoiler: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, livePhoto: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoto", useVectorId: null }, ttlSeconds: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "int", useVectorId: null }, video: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputDocument", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaGeoPoint", constructorId: 4190388548, argsConfig: { geoPoint: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGeoPoint", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaContact", constructorId: 4171988475, argsConfig: { phoneNumber: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, firstName: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, lastName: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, vcard: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaUploadedDocument", constructorId: 58495792, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, nosoundVideo: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "true", useVectorId: null }, forceFile: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "true", useVectorId: null }, spoiler: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "true", useVectorId: null }, file: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputFile", useVectorId: null }, thumb: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputFile", useVectorId: null }, mimeType: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, attributes: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "DocumentAttribute", useVectorId: true }, stickers: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "InputDocument", useVectorId: true }, videoCover: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "InputPhoto", useVectorId: null }, videoTimestamp: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 7, flagIndicator: false, type: "int", useVectorId: null }, ttlSeconds: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaDocument", constructorId: 2826320565, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, spoiler: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputDocument", useVectorId: null }, videoCover: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "InputPhoto", useVectorId: null }, videoTimestamp: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "int", useVectorId: null }, ttlSeconds: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "int", useVectorId: null }, query: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaVenue", constructorId: 3242007569, argsConfig: { geoPoint: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGeoPoint", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, address: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, provider: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, venueId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, venueType: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaPhotoExternal", constructorId: 3854302746, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, spoiler: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, url: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, ttlSeconds: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaDocumentExternal", constructorId: 2006319353, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, spoiler: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, url: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, ttlSeconds: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "int", useVectorId: null }, videoCover: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputPhoto", useVectorId: null }, videoTimestamp: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaGame", constructorId: 3544138739, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGame", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaInvoice", constructorId: 1080028941, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, description: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, photo: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "InputWebDocument", useVectorId: null }, invoice: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "Invoice", useVectorId: null }, payload: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, provider: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "string", useVectorId: null }, providerData: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "DataJSON", useVectorId: null }, startParam: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null }, extendedMedia: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputMedia", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaGeoLive", constructorId: 2535434307, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, stopped: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, geoPoint: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGeoPoint", useVectorId: null }, heading: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "int", useVectorId: null }, period: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "int", useVectorId: null }, proximityNotificationRadius: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaPoll", constructorId: 2285519112, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, poll: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "Poll", useVectorId: null }, correctAnswers: { isVector: true, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "int", useVectorId: true }, attachedMedia: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "InputMedia", useVectorId: null }, solution: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null }, solutionEntities: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "MessageEntity", useVectorId: true }, solutionMedia: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputMedia", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaDice", constructorId: 3866083195, argsConfig: { emoticon: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaStory", constructorId: 2315114360, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaWebPage", constructorId: 3256584265, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, forceLargeMedia: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, forceSmallMedia: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, optional: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, url: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaPaidMedia", constructorId: 3289396102, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, starsAmount: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, extendedMedia: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputMedia", useVectorId: true }, payload: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaTodo", constructorId: 2680512478, argsConfig: { todo: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "TodoList", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputMediaStakeDice", constructorId: 4087948362, argsConfig: { gameHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, tonAmount: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, clientSeed: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 4210575092, result: "InputMedia", isFunction: false },
    { name: "InputChatPhotoEmpty", constructorId: 480546647, argsConfig: {}, subclassOfId: 3572182388, result: "InputChatPhoto", isFunction: false },
    { name: "InputChatUploadedPhoto", constructorId: 3184373440, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, file: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "InputFile", useVectorId: null }, video: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "InputFile", useVectorId: null }, videoStartTs: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "double", useVectorId: null }, videoEmojiMarkup: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "VideoSize", useVectorId: null } }, subclassOfId: 3572182388, result: "InputChatPhoto", isFunction: false },
    { name: "InputChatPhoto", constructorId: 2303962423, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoto", useVectorId: null } }, subclassOfId: 3572182388, result: "InputChatPhoto", isFunction: false },
    { name: "InputGeoPointEmpty", constructorId: 3837862870, argsConfig: {}, subclassOfId: 70308389, result: "InputGeoPoint", isFunction: false },
    { name: "InputGeoPoint", constructorId: 1210199983, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, lat: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "double", useVectorId: null }, long: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "double", useVectorId: null }, accuracyRadius: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 70308389, result: "InputGeoPoint", isFunction: false },
    { name: "InputPhotoEmpty", constructorId: 483901197, argsConfig: {}, subclassOfId: 2221106144, result: "InputPhoto", isFunction: false },
    { name: "InputPhoto", constructorId: 1001634122, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, fileReference: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 2221106144, result: "InputPhoto", isFunction: false },
    { name: "InputFileLocation", constructorId: 3755650017, argsConfig: { volumeId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, localId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, secret: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, fileReference: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "InputEncryptedFileLocation", constructorId: 4112735573, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "InputDocumentFileLocation", constructorId: 3134223748, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, fileReference: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, thumbSize: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "InputSecureFileLocation", constructorId: 3418877480, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "InputTakeoutFileLocation", constructorId: 700340377, argsConfig: {}, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "InputPhotoFileLocation", constructorId: 1075322878, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, fileReference: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, thumbSize: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "InputPhotoLegacyFileLocation", constructorId: 3627312883, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, fileReference: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, volumeId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, localId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, secret: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "InputPeerPhotoFileLocation", constructorId: 925204121, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, big: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, photoId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "InputStickerSetThumb", constructorId: 2642736091, argsConfig: { stickerset: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStickerSet", useVectorId: null }, thumbVersion: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "InputGroupCallStream", constructorId: 93890858, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, timeMs: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, scale: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, videoChannel: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "int", useVectorId: null }, videoQuality: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 354669666, result: "InputFileLocation", isFunction: false },
    { name: "PeerUser", constructorId: 1498486562, argsConfig: { userId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 47470215, result: "Peer", isFunction: false },
    { name: "PeerChat", constructorId: 918946202, argsConfig: { chatId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 47470215, result: "Peer", isFunction: false },
    { name: "PeerChannel", constructorId: 2728736542, argsConfig: { channelId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 47470215, result: "Peer", isFunction: false },
    { name: "FileUnknown", constructorId: 2861972229, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "FilePartial", constructorId: 1086091090, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "FileJpeg", constructorId: 8322574, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "FileGif", constructorId: 3403786975, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "FilePng", constructorId: 172975040, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "FilePdf", constructorId: 2921222285, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "FileMp3", constructorId: 1384777335, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "FileMov", constructorId: 1258941372, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "FileMp4", constructorId: 3016663268, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "FileWebp", constructorId: 276907596, argsConfig: {}, subclassOfId: 4087473907, result: "storage.FileType", isFunction: false, namespace: "storage" },
    { name: "UserEmpty", constructorId: 3552332666, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 765557111, result: "User", isFunction: false },
    { name: "User", constructorId: 2981678211, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, self: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 10, flagIndicator: false, type: "true", useVectorId: null }, contact: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 11, flagIndicator: false, type: "true", useVectorId: null }, mutualContact: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 12, flagIndicator: false, type: "true", useVectorId: null }, deleted: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 13, flagIndicator: false, type: "true", useVectorId: null }, bot: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 14, flagIndicator: false, type: "true", useVectorId: null }, botChatHistory: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 15, flagIndicator: false, type: "true", useVectorId: null }, botNochats: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 16, flagIndicator: false, type: "true", useVectorId: null }, verified: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 17, flagIndicator: false, type: "true", useVectorId: null }, restricted: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 18, flagIndicator: false, type: "true", useVectorId: null }, min: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 20, flagIndicator: false, type: "true", useVectorId: null }, botInlineGeo: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 21, flagIndicator: false, type: "true", useVectorId: null }, support: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 23, flagIndicator: false, type: "true", useVectorId: null }, scam: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 24, flagIndicator: false, type: "true", useVectorId: null }, applyMinPhoto: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 25, flagIndicator: false, type: "true", useVectorId: null }, fake: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 26, flagIndicator: false, type: "true", useVectorId: null }, botAttachMenu: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 27, flagIndicator: false, type: "true", useVectorId: null }, premium: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 28, flagIndicator: false, type: "true", useVectorId: null }, attachMenuEnabled: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 29, flagIndicator: false, type: "true", useVectorId: null }, flags2: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, botCanEdit: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, closeFriend: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, storiesHidden: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 3, flagIndicator: false, type: "true", useVectorId: null }, storiesUnavailable: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 4, flagIndicator: false, type: "true", useVectorId: null }, contactRequirePremium: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 10, flagIndicator: false, type: "true", useVectorId: null }, botBusiness: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 11, flagIndicator: false, type: "true", useVectorId: null }, botHasMainApp: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 13, flagIndicator: false, type: "true", useVectorId: null }, botForumView: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 16, flagIndicator: false, type: "true", useVectorId: null }, botForumCanManageTopics: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 17, flagIndicator: false, type: "true", useVectorId: null }, botCanManageBots: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 18, flagIndicator: false, type: "true", useVectorId: null }, botGuestchat: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 19, flagIndicator: false, type: "true", useVectorId: null }, botGuard: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 20, flagIndicator: false, type: "true", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, accessHash: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "long", useVectorId: null }, firstName: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null }, lastName: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "string", useVectorId: null }, username: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "string", useVectorId: null }, phone: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "string", useVectorId: null }, photo: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "UserProfilePhoto", useVectorId: null }, status: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "UserStatus", useVectorId: null }, botInfoVersion: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 14, flagIndicator: false, type: "int", useVectorId: null }, restrictionReason: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 18, flagIndicator: false, type: "RestrictionReason", useVectorId: true }, botInlinePlaceholder: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 19, flagIndicator: false, type: "string", useVectorId: null }, langCode: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 22, flagIndicator: false, type: "string", useVectorId: null }, emojiStatus: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 30, flagIndicator: false, type: "EmojiStatus", useVectorId: null }, usernames: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags2", flagIndex: 0, flagIndicator: false, type: "Username", useVectorId: true }, storiesMaxId: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags2", flagIndex: 5, flagIndicator: false, type: "RecentStory", useVectorId: null }, color: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags2", flagIndex: 8, flagIndicator: false, type: "PeerColor", useVectorId: null }, profileColor: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags2", flagIndex: 9, flagIndicator: false, type: "PeerColor", useVectorId: null }, botActiveUsers: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 12, flagIndicator: false, type: "int", useVectorId: null }, botVerificationIcon: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 14, flagIndicator: false, type: "long", useVectorId: null }, sendPaidMessagesStars: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 15, flagIndicator: false, type: "long", useVectorId: null }, linkedCommunityId: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags2", flagIndex: 21, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 765557111, result: "User", isFunction: false },
    { name: "UserProfilePhotoEmpty", constructorId: 1326562017, argsConfig: {}, subclassOfId: 3325267837, result: "UserProfilePhoto", isFunction: false },
    { name: "UserProfilePhoto", constructorId: 2194798342, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, hasVideo: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, personal: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, photoId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, strippedThumb: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "bytes", useVectorId: null }, dcId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 3325267837, result: "UserProfilePhoto", isFunction: false },
    { name: "UserStatusEmpty", constructorId: 164646985, argsConfig: {}, subclassOfId: 1527477310, result: "UserStatus", isFunction: false },
    { name: "UserStatusOnline", constructorId: 3988339017, argsConfig: { expires: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1527477310, result: "UserStatus", isFunction: false },
    { name: "UserStatusOffline", constructorId: 9203775, argsConfig: { wasOnline: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1527477310, result: "UserStatus", isFunction: false },
    { name: "UserStatusRecently", constructorId: 2065268168, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, byMe: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null } }, subclassOfId: 1527477310, result: "UserStatus", isFunction: false },
    { name: "UserStatusLastWeek", constructorId: 1410997530, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, byMe: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null } }, subclassOfId: 1527477310, result: "UserStatus", isFunction: false },
    { name: "UserStatusLastMonth", constructorId: 1703516023, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, byMe: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null } }, subclassOfId: 1527477310, result: "UserStatus", isFunction: false },
    { name: "ChatEmpty", constructorId: 693512293, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 3316604308, result: "Chat", isFunction: false },
    { name: "Chat", constructorId: 1103884886, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, creator: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, left: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, deactivated: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "true", useVectorId: null }, callActive: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 23, flagIndicator: false, type: "true", useVectorId: null }, callNotEmpty: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 24, flagIndicator: false, type: "true", useVectorId: null }, noforwards: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 25, flagIndicator: false, type: "true", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, photo: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "ChatPhoto", useVectorId: null }, participantsCount: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, date: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, version: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, migratedTo: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "InputChannel", useVectorId: null }, adminRights: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 14, flagIndicator: false, type: "ChatAdminRights", useVectorId: null }, defaultBannedRights: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 18, flagIndicator: false, type: "ChatBannedRights", useVectorId: null } }, subclassOfId: 3316604308, result: "Chat", isFunction: false },
    { name: "ChatForbidden", constructorId: 1704108455, argsConfig: { id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 3316604308, result: "Chat", isFunction: false },
