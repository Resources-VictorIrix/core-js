/* eslint-disable no-sparse-arrays, unicorn/prefer-array-flat -- required for testing */
QUnit.test('Array#concat', assert => {
  const { concat } = Array.prototype;
  assert.isFunction(concat);
  assert.arity(concat, 1);
  assert.name(concat, 'concat');
  assert.looksNative(concat);
  assert.nonEnumerable(Array.prototype, 'concat');
  let array = [1, 2];
  const sparseArray = [1, , 2];
  const nonSpreadableArray = [1, 2];
  nonSpreadableArray[Symbol.isConcatSpreadable] = false;
  const arrayLike = { 0: 1, 1: 2, length: 2 };
  const spreadableArrayLike = { 0: 1, 1: 2, length: 2, [Symbol.isConcatSpreadable]: true };
  assert.deepEqual(array.concat(), [1, 2], '#1');
  assert.deepEqual(sparseArray.concat(), [1, , 2], '#2');
  assert.deepEqual(nonSpreadableArray.concat(), [[1, 2]], '#3');
  assert.deepEqual(concat.call(arrayLike), [{ 0: 1, 1: 2, length: 2 }], '#4');
  assert.deepEqual(concat.call(spreadableArrayLike), [1, 2], '#5');
  assert.deepEqual([].concat(array), [1, 2], '#6');
  assert.deepEqual([].concat(sparseArray), [1, , 2], '#7');
  assert.deepEqual([].concat(nonSpreadableArray), [[1, 2]], '#8');
  assert.deepEqual([].concat(arrayLike), [{ 0: 1, 1: 2, length: 2 }], '#9');
  assert.deepEqual([].concat(spreadableArrayLike), [1, 2], '#10');
  assert.deepEqual(array.concat(sparseArray, nonSpreadableArray, arrayLike, spreadableArrayLike), [
    1, 2, 1, , 2, [1, 2], { 0: 1, 1: 2, length: 2 }, 1, 2,
  ], '#11');
  array = [];
  // eslint-disable-next-line object-shorthand -- constructor
  array.constructor = { [Symbol.species]: function () {
    return { foo: 1 };
  } };
  // https://bugs.webkit.org/show_bug.cgi?id=281061
  // eslint-disable-next-line es/no-nonstandard-array-prototype-properties -- @@species
  assert.same(array.concat().foo, 1, '@@species');
});
