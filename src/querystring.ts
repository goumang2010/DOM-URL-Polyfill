// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// Query String Utilities

import { isHexTable } from './hex';
// const { Buffer } = require('buffer');

// const QueryString = module.exports = {
//   // unescapeBuffer,
//   // `unescape()` is a JS global, so we need to use a different local name
//   // unescape: qsUnescape,

//   // `escape()` is a JS global, so we need to use a different local name
//   // escape: qsEscape,

//   stringify,
//   encode: stringify,

//   parse,
//   decode: parse
// };

// function qsUnescape(s, decodeSpaces) {
//   try {
//     return decodeURIComponent(s);
//   } catch (e) {
//     return s
//   }
// }

// These characters do not need escaping when generating query strings:
// ! - . _ ~
// ' ( ) *
// digits
// alpha (uppercase)
// alpha (lowercase)

// QueryString.escape() replaces encodeURIComponent()
// http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.3.4

function stringifyPrimitive(v) {
  if (typeof v === 'string')
    return v;
  if (typeof v === 'number' && isFinite(v))
    return '' + v;
  if (typeof v === 'boolean')
    return v ? 'true' : 'false';
  return '';
}

export function stringify(obj, sep?, eq?, options?) {
  sep = sep || '&';
  eq = eq || '=';

  var encode = encodeURIComponent;

  if (obj !== null && typeof obj === 'object') {
    var keys = Object.keys(obj);
    var len = keys.length;
    var flast = len - 1;
    var fields = '';
    for (var i = 0; i < len; ++i) {
      var k = keys[i];
      var v = obj[k];
      var ks = encode(stringifyPrimitive(k)) + eq;

      if (Array.isArray(v)) {
        var vlen = v.length;
        var vlast = vlen - 1;
        for (var j = 0; j < vlen; ++j) {
          fields += ks + encode(stringifyPrimitive(v[j]));
          if (j < vlast)
            fields += sep;
        }
        if (vlen && i < flast)
          fields += sep;
      } else {
        fields += ks + encode(stringifyPrimitive(v));
        if (i < flast)
          fields += sep;
      }
    }
    return fields;
  }
  return '';
}

function charCodes(str: string) {
  if (str.length === 0) return [];
  if (str.length === 1) return [str.charCodeAt(0)];
  const ret: number[] = [];
  for (var i = 0; i < str.length; ++i)
    ret[ret.length] = str.charCodeAt(i);
  return ret;
}
const defSepCodes = [38]; // &
const defEqCodes = [61]; // =

interface ParseOptions {
  maxKeys?: number;
}

// Parse a key/val string.
export function parse(qs: string, sep?: string, eq?: string, options?: ParseOptions) {
  const obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var sepCodes = (!sep ? defSepCodes : charCodes(sep + ''));
  var eqCodes = (!eq ? defEqCodes : charCodes(eq + ''));
  const sepLen = sepCodes.length;
  const eqLen = eqCodes.length;

  var pairs = 1000;
  if (options && typeof options.maxKeys === 'number') {
    // -1 is used in place of a value like Infinity for meaning
    // "unlimited pairs" because of additional checks V8 (at least as of v5.4)
    // has to do when using variables that contain values like Infinity. Since
    // `pairs` is always decremented and checked explicitly for 0, -1 works
    // effectively the same as Infinity, while providing a significant
    // performance boost.
    pairs = (options.maxKeys > 0 ? options.maxKeys : -1);
  }

  var decode: Function = decodeURIComponent;
  const customDecode = false;

  const keys: string[] = [];
  var lastPos = 0;
  var sepIdx = 0;
  var eqIdx = 0;
  var key = '';
  var value = '';
  var keyEncoded = customDecode;
  var valEncoded = customDecode;
  const plusChar = (customDecode ? '%20' : ' ');
  var encodeCheck = 0;
  for (var i = 0; i < qs.length; ++i) {
    const code = qs.charCodeAt(i);

    // Try matching key/value pair separator (e.g. '&')
    if (code === sepCodes[sepIdx]) {
      if (++sepIdx === sepLen) {
        // Key/value pair separator match!
        const end = i - sepIdx + 1;
        if (eqIdx < eqLen) {
          // We didn't find the (entire) key/value separator
          if (lastPos < end) {
            // Treat the substring as part of the key instead of the value
            key += qs.slice(lastPos, end);
            if (keyEncoded)
              key = decode(key);
          } else {
            // We saw an empty substring between separators
            if (--pairs === 0)
              return obj;
            lastPos = i + 1;
            sepIdx = eqIdx = 0;
            continue;
          }
        } else {
          if (lastPos < end) {
            value += qs.slice(lastPos, end);
            if (valEncoded)
              value = decode(value);
          }
          if (keyEncoded)
            key = decode(key);
        }

        // Use a key array lookup instead of using hasOwnProperty(), which is
        // slower
        if (keys.indexOf(key) === -1) {
          obj[key] = value;
          keys[keys.length] = key;
        } else {
          const curValue = obj[key];
          // A simple Array-specific property check is enough here to
          // distinguish from a string value and is faster and still safe
          // since we are generating all of the values being assigned.
          if (curValue.pop)
            curValue[curValue.length] = value;
          else
            obj[key] = [curValue, value];
        }
        if (--pairs === 0)
          return obj;
        keyEncoded = valEncoded = customDecode;
        key = value = '';
        encodeCheck = 0;
        lastPos = i + 1;
        sepIdx = eqIdx = 0;
      }
    } else {
      sepIdx = 0;
      // Try matching key/value separator (e.g. '=') if we haven't already
      if (eqIdx < eqLen) {
        if (code === eqCodes[eqIdx]) {
          if (++eqIdx === eqLen) {
            // Key/value separator match!
            const end = i - eqIdx + 1;
            if (lastPos < end)
              key += qs.slice(lastPos, end);
            encodeCheck = 0;
            lastPos = i + 1;
          }
          continue;
        } else {
          eqIdx = 0;
          if (!keyEncoded) {
            // Try to match an (valid) encoded byte once to minimize unnecessary
            // calls to string decoding functions
            if (code === 37/*%*/) {
              encodeCheck = 1;
              continue;
            } else if (encodeCheck > 0) {
              // eslint-disable-next-line no-extra-boolean-cast
              if (!!isHexTable[code]) {
                if (++encodeCheck === 3)
                  keyEncoded = true;
                continue;
              } else {
                encodeCheck = 0;
              }
            }
          }
        }
        if (code === 43/*+*/) {
          if (lastPos < i)
            key += qs.slice(lastPos, i);
          key += plusChar;
          lastPos = i + 1;
          continue;
        }
      }
      if (code === 43/*+*/) {
        if (lastPos < i)
          value += qs.slice(lastPos, i);
        value += plusChar;
        lastPos = i + 1;
      } else if (!valEncoded) {
        // Try to match an (valid) encoded byte (once) to minimize unnecessary
        // calls to string decoding functions
        if (code === 37/*%*/) {
          encodeCheck = 1;
        } else if (encodeCheck > 0) {
          // eslint-disable-next-line no-extra-boolean-cast
          if (!!isHexTable[code]) {
            if (++encodeCheck === 3)
              valEncoded = true;
          } else {
            encodeCheck = 0;
          }
        }
      }
    }
  }

  // Deal with any leftover key or value data
  if (lastPos < qs.length) {
    if (eqIdx < eqLen)
      key += qs.slice(lastPos);
    else if (sepIdx < sepLen)
      value += qs.slice(lastPos);
  } else if (eqIdx === 0) {
    // We ended on an empty substring
    return obj;
  }
  if (keyEncoded)
    key = decode(key);
  if (valEncoded)
    value = decode(value);
  // Use a key array lookup instead of using hasOwnProperty(), which is slower
  if (keys.indexOf(key) === -1) {
    obj[key] = value;
    keys[keys.length] = key;
  } else {
    const curValue = obj[key];
    // A simple Array-specific property check is enough here to
    // distinguish from a string value and is faster and still safe since
    // we are generating all of the values being assigned.
    if (curValue.pop)
      curValue[curValue.length] = value;
    else
      obj[key] = [curValue, value];
  }

  return obj;
}
