# Microlock
A dead simple distributed locking library for Node.js and [etcd](http://github.com/coreos/etcd) (via [node-etcd](https://github.com/stianeikeland/node-etcd))

[![NPM](https://nodei.co/npm/microlock.png)](https://nodei.co/npm/microlock/)

[![CircleCI](https://circleci.com/gh/Jobstart/microlock.svg?style=shield)](https://circleci.com/gh/thebigredgeek/microlock/tree/master)




## What is Etcd?

[Etcd](https://github.com/coreos/etcd) is a distributed key-value store, built by the [CoreOS](https://coreos.com/) team, that provides strong guarantees around consistency and partition tolerance.  Data is duplicated to all nodes in a given cluster and remains consistent between node failures.  Cluster leaders are elected via the [Raft consensus algorithm](https://raft.github.io/).  Etcd provides operations for atomic value swapping/removal based on criteria and TTL for values, making it a perfect media for distributed locks.

## What is a distrbuted lock?

A distributed lock is a mechanism that provides serialized flow control on a context that is acted on by more than one process.  These processes typically operate on different machines via Service Oriented Architecture.  Each process uses an object called a distributed lock to "lock" access to the shared context, aliased by a key, so that only one process, each aliased by a node id, can act on it at a time, thereby ensuring consistency and preventing race conditions.

## Why not Redlock?

Redis is great for a lot of things, and we love using it at Jobstart.  Caching, keeping processes stateless, and fast access to simply structured data are all cases where Redis shines.  However, implementing a distributed lock with Redis via Redlock has several caveats that are unsuitable for many cases.  Namely, if you need strong guarantees that a lock will not be acquired by multiple nodes at once even in the event of failure, Redlock isn't a viable option.

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

All methods (except destroy) return promises, making it easy to use features like async/await with ES2016/ES2017 via Babel.

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

## Contributing

Submit a PR.  Easy at that!

### Building

```bash
  $ make
```

### Linting

```bash
  $ make lint
```

### Running unit tests

```bash
  $ make unit
```

### Running integration tests

**[Docker Compose](https://docs.docker.com/compose/) is required**

```bash
  $ make integration etcd_image_version=v2.2.2
```

You can use whatever version you'd like to test against in the command above.
