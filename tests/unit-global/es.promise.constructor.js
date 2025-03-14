import { DESCRIPTORS, GLOBAL, NATIVE, PROTO, STRICT } from '../helpers/constants.js';

const Symbol = GLOBAL.Symbol || {};
const { setPrototypeOf, create } = Object;

QUnit.test('Promise', assert => {
  assert.isFunction(Promise);
  assert.arity(Promise, 1);
  assert.name(Promise, 'Promise');
  assert.looksNative(Promise);
  assert.throws(() => {
    Promise();
  }, 'throws w/o `new`');
  new Promise(function (resolve, reject) {
    assert.isFunction(resolve, 'resolver is function');
    assert.isFunction(reject, 'rejector is function');
    if (STRICT) assert.same(this, undefined, 'correct executor context');
  });
});

if (DESCRIPTORS) QUnit.test('Promise operations order', assert => {
  let $resolve, $resolve2;
  assert.expect(1);
  const EXPECTED_ORDER = 'DEHAFGBC';
  const async = assert.async();
  let result = '';
  const promise1 = new Promise(resolve => {
    $resolve = resolve;
  });
  $resolve({
    // eslint-disable-next-line unicorn/no-thenable -- required for testing
    then() {
      result += 'A';
      throw new Error();
    },
  });
  promise1.catch(() => {
    result += 'B';
  });
  promise1.catch(() => {
    result += 'C';
    assert.same(result, EXPECTED_ORDER);
    async();
  });
  const promise2 = new Promise(resolve => {
    $resolve2 = resolve;
  });
  // eslint-disable-next-line unicorn/no-thenable -- required for testing
  $resolve2(Object.defineProperty({}, 'then', {
    get() {
      result += 'D';
      throw new Error();
    },
  }));
  result += 'E';
  promise2.catch(() => {
    result += 'F';
  });
  promise2.catch(() => {
    result += 'G';
  });
  result += 'H';
  setTimeout(() => {
    if (!~result.indexOf('C')) {
      assert.same(result, EXPECTED_ORDER);
      async();
    }
  }, 1e3);
});

QUnit.test('Promise#then', assert => {
  assert.isFunction(Promise.prototype.then);
  if (NATIVE) assert.arity(Promise.prototype.then, 2);
  assert.name(Promise.prototype.then, 'then');
  assert.looksNative(Promise.prototype.then);
  assert.nonEnumerable(Promise.prototype, 'then');
  let promise = new Promise(resolve => {
    resolve(42);
  });
  const FakePromise1 = promise.constructor = function (executor) {
    executor(() => { /* empty */ }, () => { /* empty */ });
  };
  const FakePromise2 = FakePromise1[Symbol.species] = function (executor) {
    executor(() => { /* empty */ }, () => { /* empty */ });
  };
  assert.true(promise.then(() => { /* empty */ }) instanceof FakePromise2, 'subclassing, @@species pattern');
  promise = new Promise(resolve => {
    resolve(42);
  });
  promise.constructor = function (executor) {
    executor(() => { /* empty */ }, () => { /* empty */ });
  };
  assert.true(promise.then(() => { /* empty */ }) instanceof Promise, 'subclassing, incorrect `this` pattern');
  promise = new Promise(resolve => {
    resolve(42);
  });
  const FakePromise3 = promise.constructor = function (executor) {
    executor(() => { /* empty */ }, () => { /* empty */ });
  };
  FakePromise3[Symbol.species] = function () { /* empty */ };
  assert.throws(() => {
    promise.then(() => { /* empty */ });
  }, 'NewPromiseCapability validations, #1');
  FakePromise3[Symbol.species] = function (executor) {
    executor(null, () => { /* empty */ });
  };
  assert.throws(() => {
    promise.then(() => { /* empty */ });
  }, 'NewPromiseCapability validations, #2');
  FakePromise3[Symbol.species] = function (executor) {
    executor(() => { /* empty */ }, null);
  };
  assert.throws(() => {
    promise.then(() => { /* empty */ });
  }, 'NewPromiseCapability validations, #3');
});

QUnit.test('Promise#@@toStringTag', assert => {
  assert.same(Promise.prototype[Symbol.toStringTag], 'Promise', 'Promise::@@toStringTag is `Promise`');
  assert.same(String(new Promise(() => { /* empty */ })), '[object Promise]', 'correct stringification');
});

if (PROTO) QUnit.test('Promise subclassing', assert => {
  function SubPromise(executor) {
    const self = new Promise(executor);
    setPrototypeOf(self, SubPromise.prototype);
    // eslint-disable-next-line es/no-nonstandard-promise-prototype-properties -- safe
    self.mine = 'subclass';
    return self;
  }
  setPrototypeOf(SubPromise, Promise);
  SubPromise.prototype = create(Promise.prototype);
  SubPromise.prototype.constructor = SubPromise;
  let promise1 = SubPromise.resolve(5);
  assert.same(promise1.mine, 'subclass');
  promise1 = promise1.then(it => {
    assert.same(it, 5);
  });
  assert.same(promise1.mine, 'subclass');
  let promise2 = new SubPromise(resolve => {
    resolve(6);
  });
  assert.same(promise2.mine, 'subclass');
  promise2 = promise2.then(it => {
    assert.same(it, 6);
  });
  assert.same(promise2.mine, 'subclass');
  const promise3 = SubPromise.all([promise1, promise2]);
  assert.same(promise3.mine, 'subclass');
  assert.true(promise3 instanceof Promise);
  assert.true(promise3 instanceof SubPromise);
  promise3.then(assert.async(), error => {
    assert.avoid(error);
  });
});

// qunit@2.5 strange bug
QUnit.skip('Unhandled rejection tracking', assert => {
  let done = false;
  const resume = assert.async();
  if (GLOBAL.process) {
    assert.expect(3);
    function onunhandledrejection(reason, promise) {
      process.removeListener('unhandledRejection', onunhandledrejection);
      assert.same(promise, $promise, 'unhandledRejection, promise');
      assert.same(reason, 42, 'unhandledRejection, reason');
      $promise.catch(() => {
        // empty
      });
    }
    function onrejectionhandled(promise) {
      process.removeListener('rejectionHandled', onrejectionhandled);
      assert.same(promise, $promise, 'rejectionHandled, promise');
      done || resume();
      done = true;
    }
    process.on('unhandledRejection', onunhandledrejection);
    process.on('rejectionHandled', onrejectionhandled);
  } else {
    if (GLOBAL.addEventListener) {
      assert.expect(8);
      function onunhandledrejection(it) {
        assert.same(it.promise, $promise, 'addEventListener(unhandledrejection), promise');
        assert.same(it.reason, 42, 'addEventListener(unhandledrejection), reason');
        GLOBAL.removeEventListener('unhandledrejection', onunhandledrejection);
      }
      GLOBAL.addEventListener('rejectionhandled', onunhandledrejection);
      function onrejectionhandled(it) {
        assert.same(it.promise, $promise, 'addEventListener(rejectionhandled), promise');
        assert.same(it.reason, 42, 'addEventListener(rejectionhandled), reason');
        GLOBAL.removeEventListener('rejectionhandled', onrejectionhandled);
      }
      GLOBAL.addEventListener('rejectionhandled', onrejectionhandled);
    } else assert.expect(4);
    GLOBAL.onunhandledrejection = function (it) {
      assert.same(it.promise, $promise, 'onunhandledrejection, promise');
      assert.same(it.reason, 42, 'onunhandledrejection, reason');
      setTimeout(() => {
        $promise.catch(() => {
          // empty
        });
      }, 1);
      GLOBAL.onunhandledrejection = null;
    };
    GLOBAL.onrejectionhandled = function (it) {
      assert.same(it.promise, $promise, 'onrejectionhandled, promise');
      assert.same(it.reason, 42, 'onrejectionhandled, reason');
      GLOBAL.onrejectionhandled = null;
      done || resume();
      done = true;
    };
  }
  Promise.reject(43).catch(() => {
    // empty
  });
  const $promise = Promise.reject(42);
  setTimeout(() => {
    done || resume();
    done = true;
  }, 3e3);
});

const promise = (() => {
  try {
    return Function('return (async function () { /* empty */ })()')();
  } catch { /* empty */ }
})();

if (promise) QUnit.test('Native Promise, maybe patched', assert => {
  assert.isFunction(promise.then);
  assert.arity(promise.then, 2);
  assert.looksNative(promise.then);
  assert.nonEnumerable(promise.constructor.prototype, 'then');
  function empty() { /* empty */ }
  assert.true(promise.then(empty) instanceof Promise, '`.then` returns `Promise` instance #1');
  assert.true(new promise.constructor(empty).then(empty) instanceof Promise, '`.then` returns `Promise` instance #2');
  assert.true(promise.catch(empty) instanceof Promise, '`.catch` returns `Promise` instance #1');
  assert.true(new promise.constructor(empty).catch(empty) instanceof Promise, '`.catch` returns `Promise` instance #2');
  assert.true(promise.finally(empty) instanceof Promise, '`.finally` returns `Promise` instance #1');
  assert.true(new promise.constructor(empty).finally(empty) instanceof Promise, '`.finally` returns `Promise` instance #2');
});
