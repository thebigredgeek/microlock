import EventEmitter from 'events';
import { expect } from 'chai';
import Promise from 'bluebird';
import sinon from 'sinon';

import Microlock, {
  events,

  EtcdClientRequiredError,
  KeyRequiredError,
  NodeIdRequiredError,
  InvalidTtlError,
  AlreadyLockedError,
  LockNotOwnedError
} from '../../src/microlock';

class MockWatcher extends EventEmitter {
  constructor () {
    super();

    sinon.stub(this, 'on', this.on);
    sinon.stub(this, 'stop', this.close);
  }
  stop () {
    this.removeAllListeners();
  }
}

class MockEtcdClient {
  constructor (opts = {}) {
    const { setErr, setRes, compareAndDeleteErr, compareAndDeleteRes, watcher } = opts

    this.__setErr = setErr;
    this.__setRes = setRes;
    this.__compareAndDeleteErr = compareAndDeleteErr;
    this.__compareAndDeleteRes = compareAndDeleteRes;
    this.__watcher = watcher;

    sinon.stub(this, 'watcher', this.watcher)
    sinon.stub(this, 'set', this.set);
    sinon.stub(this, 'compareAndDelete', this.compareAndDelete);
  }
  watcher () {
    return this.__watcher
  }
  set (key, val, opts, cb) {
    if (this.__setErr) return cb(this.__setErr, null);
    return cb(null, this.__setRes);
  }
  compareAndDelete (key, val, cb) {
    if (this.__compareAndDeleteErr) return cb(this.__compareAndDeleteErr, null);
    return cb(null, this.__compareAndDeleteRes);
  }
}

describe('microlock', () => {
  let watcher = null
    , setRes = null
    , compareAndDeleteRes = null
    , etcd = null;
  beforeEach(() => {
    watcher = new MockWatcher();
    setRes = 'foo';
    compareAndDeleteRes = 'bar';
    etcd = new MockEtcdClient({
      watcher,
      setRes,
      compareAndDeleteRes
    });
  })
  context('etcd client not provided', () => {
    it('throws EtcdClientRequiredError', () => {
      try {
        new Microlock(null);
        throw new Error('should have thrown EtcdClientRequiredError');
      } catch (e) {
        expect(e instanceof EtcdClientRequiredError).to.be.true;
      }
    });
  });
  context('key is not a string', () => {
    it('throws KeyRequiredError', () => {
      try {
        new Microlock(watcher, 123);
        throw new Error('should have thrown KeyRequiredError');
      } catch (e) {
        expect(e instanceof KeyRequiredError).to.be.true;
      }
    });
  });
  context('node_id is not a string', () => {
    it('throws NodeIdRequiredError', () => {
      try {
        new Microlock(watcher, 'foo', 123);
        throw new Error('should have thrown NodeIdRequiredError');
      } catch (e) {
        expect(e instanceof NodeIdRequiredError).to.be.true;
      }
    });
  });
  context('ttl is not a number', () => {
    it('throws InvalidTtlError', () => {
      try {
        new Microlock(watcher, 'foo', 'bar', 'hello');
        throw new Error('should have thrown InvalidTtlError');
      } catch (e) {
        expect(e instanceof InvalidTtlError).to.be.true;
      }
    });
  });
  describe('watcher', () => {
    let microlock = null;
    beforeEach(() => {
      microlock = new Microlock(etcd, 'foo', 'bar');
    })
    context('on action "compareAndDelete"', () => {
      it('emits events.unlocked', (done) => {
        microlock.on(events.unlocked, done);
        watcher.emit('compareAndDelete');
      });
    });
    context('on action "change"', () => {
      context('if node contains ttl', () => {
        it('emits events.locked', (done) => {
          microlock.on(events.locked, done);
          watcher.emit('change', {
            node: {
              ttl: 123
            }
          });
        });
      });
    });
  });
  describe('method', () => {
    let key = null
      , node_id = null
      , ttl = null
      , microlock = null;
    beforeEach(() => {
      key = 'foo';
      node_id = 'bar';
      ttl = 123;
      microlock = new Microlock(etcd, key, node_id, ttl);
    })
    describe('destroy', () => {
      it('stops watchers', () => {
        microlock.destroy();
        expect(watcher.stop.calledOnce).to.be.true;
      });
      it('removes all event listeners', () => {
        sinon.stub(microlock, 'removeAllListeners');
        microlock.destroy();
        expect(microlock.removeAllListeners.calledOnce).to.be.true;
      });
    });
    describe('lock', () => {
      context('when able to verify unlocked state', () => {
        it('sets the state to locked', () => {
          microlock.lock();
          expect(etcd.set.calledWith(key, node_id, {
            ttl,
            prevExist: false
          })).to.be.true;
        });
        it('returns a resolving promise passing the etcd response', (done) => {
          microlock.lock()
          .then((res) => expect(res).to.equal(setRes))
          .then(() => done(), done);
        });
      });
      context('when unable to verify locked', () => {
        beforeEach(() => {
          etcd.__setErr = true;
        });
        it('returns a rejecting promise passing AlreadyLockedError', (done) => {
          microlock.lock()
          .catch((e) => expect(e instanceof AlreadyLockedError).to.be.true)
          .then(() => done(), done);
        });
      });
    });
    describe('unlock', () => {
      context('when able to verify locked state by current node', () => {
        it('sets the state to unlocked', () => {
          microlock.unlock();
          expect(etcd.compareAndDelete.calledWith(key, node_id)).to.be.true;
        });
        it('returns a resolving promise passing the etcd response', (done) => {
          microlock.unlock()
          .then((res) => expect(res).to.equal(compareAndDeleteRes))
          .then(() => done(), done)
        });
      });
      context('when not able to verify locked state by current node', () => {
        it('returns a rejecting promise passing LockNotOwnedError', (done) => {
          microlock.unlock()
          .catch((e) => expect(e instanceof LockNotOwnedError).to.be.true)
          .then(() => done(), done);
        });
      });
    });
    describe('renew', () => {
      context('when able to verify locked stat by current node', () => {
        it('sets the state to locked with a refreshed ttl', () => {
          microlock.renew();
          expect(etcd.set.calledWith(key, node_id, {
            ttl,
            prevExist: true,
            prevValue: node_id,
            refresh: true
          })).to.be.true;
        });
        it('returns a resolving promise passing the etcd response', (done) => {
          microlock.renew()
          .then((res) => expect(res).to.equal(setRes))
          .then(() => done(), done);
        });
      });
      context('when not able to verify locked state by current node', () => {
        beforeEach(() => {
          etcd.__setErr = true;
        });
        it('returns a rejecting promise passing LockNotOwnedError', (done) => {
          microlock.renew()
          .catch((e) => expect(e instanceof LockNotOwnedError).to.be.true)
          .then(() => done(), done);
        });
      });
    });
  });
});
