# Microlock
A dead simple distributed locking library for Node.js and [etcd](http://github.com/coreos/etcd) (via [node-etcd](https://github.com/stianeikeland/node-etcd))

[![NPM](https://nodei.co/npm/microlock.png)](https://nodei.co/npm/microlock/)

[![CircleCI](https://circleci.com/gh/thebigredgeek/microlock/tree/master.svg?style=shield)](https://circleci.com/gh/thebigredgeek/microlock/tree/master)


## What is a distrbuted lock?

A distributed lock is a mechanism that provides serialized flow control on a context that is acted on by more than one process.  These processes typically operate on different machines via Service Oriented Architecture.  Each process uses an object called a distributed lock to "lock" access to the shared context so that only one process can act on it at a time, thereby ensuring consistency and preventing race conditions.

## Notes

Microlock is currently compatible with Etd 2.2.x.  Within the next two weeks, there will be full support and test coverage for Etcd 2.2.x - 3.x.

## Install
**Requires NodeJS >= 4.0**

```bash
$ npm install microlock
```

## Basic usage

### ES5
```javascript
var os = require('os');
var Etcd = require('node-etcd');
var Microlock = require('microlock');

var key = 'foo'; //name of the lock
var id = os.hostname(); //id of *this* node
var ttl = 5; //5 second lease on lock

var etcd = new Etcd();
var foo = new Microlock.default(etcd, key, id, ttl);

foo.lock().then(function () {
  // foo is locked by this node

  // do some stuff...

  // release the lock
  return foo.unlock();
}, function (e) {
  if (e instanceof Microlock.AlreadyLockedError) {
    // foo is already locked by a different node
  }
});
```

### ES2015 (with babel)
```javascript
import { hostname } from 'os';
import Etcd from 'node-etcd';
import Microlock, { AlreadyLockedError } from 'microlock';

const key = 'foo'; //name of the lock
const id = hostname(); //id of *this* node
const ttl = 5; //5 second lease on lock

const etcd = new Etcd();
const foo = new Microlock(etcd, key, id, ttl);

foo.lock().then(() => {
  // foo is locked by this node

  // do some stuff...

  // release the lock
  return foo.unlock();
}, (e) => {
  if (e instanceof AlreadyLockedError) {
    // foo is already locked by a different node
  }
});
```

### ES2016/2017 (with babel)
```javascript

import { hostname } from 'os';
import Etcd from 'node-etcd';
import Microlock, { AlreadyLockedError } from 'microlock';

async function main () {

  const key = 'foo'; //name of the lock
  const id = hostname(); //id of *this* node
  const ttl = 5; //5 second lease on lock

  const etcd = new Etcd();
  const foo = new Microlock(etcd, key, id, ttl);

  try {
    await foo.lock();
    // foo is locked by this node

    // do some stuff...

    // release the lock
    await foo.unlock();
  } catch (e) {
    if (e instanceof AlreadyLockedError) {
      // foo is already locked by a different node
    }
  }
}

main();
```

## Methods

### Microlock(etcd, key, node_id, [ttl = 1])
Creates a microlock client for a lock key.

```javascript
var Etcd = require('node-etcd');
var Microlock = require('microlock');

var etcd = new Etcd();
var foo = new Microlock.default(microlock, 'foo', 'bar');
```

### .lock()
Attempts to lock the `key` for the `node_id`.

```javascript
foo.lock().then(function () {
  // foo is locked by this node
}, function (e) {
  if (e instanceof Microlock.AlreadyLockedError) {
    // foo is already locked by a different node
  }
});
```

### .unlock()
Attempts to release the `key` for the `node_id`.

```javascript
foo.unlock().then(function () {
  // foo is unlocked
}, function (e) {
  if (e instanceof Microlock.LockNotOwnedError) {
    // foo is not locked by `node_id`
  }
})
```

### .renew()
Attempts to renew the lock on `key` for the `node_id`.

```javascript
foo.renew().then(function () {
  // foo lease is renewed... ttl is refreshed
}, function (e) {
  if (e instanceof Microlock.LockNotOwnedError) {
    // foo is not locked by `node_id`
  }
})
```

### .destroy()
Unbinds listeners/watchers from this client

## Events

### unlock
Emits when the key is unlocked (node agnostic)

```javascript
foo.on(Microlock.events.unlocked, function () {
  //handle unlocked with constant
});

foo.on('unlocked', function () {
  //handle unlocked with string
});
```

### locked
Emits when the key is locked (node agnostic)

```javascript
foo.on(Microlock.events.locked, function () {
  //handle locked with constant
});

foo.on('locked', function () {
  //handle locked with string
});
```
