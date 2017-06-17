import { expect } from 'chai';
import sinon from 'sinon';
import Promise from 'bluebird';
import Etcd from 'node-etcd';

import Microlock, {
  events,

  EtcdClientRequiredError,
  KeyRequiredError,
  NodeIdRequiredError,
  InvalidTtlError,
  AlreadyLockedError,
  LockNotOwnedError
} from '../../src/microlock';

describe('microlock', () => {
  let etcd = null
    , key = null
    , node1 = null
    , node2 = null
    , lock1 = null
    , lock2 = null
    , ttl = null;

  beforeEach(() => {
    etcd = new Etcd();

    key = 'key';

    node1 = 'node_1';
    node2 = 'node_2';

    ttl = 5;

    lock1 = new Microlock(etcd, key, node1, ttl);
    lock2 = new Microlock(etcd, key, node2, ttl);
  });

  afterEach(() => Promise.all([
    lock1.unlock(),
    lock2.unlock()
  ]).catch((e) => e));

  describe('lock', () => {
    context('is locked', () => {
      beforeEach(() => lock2.lock());
      it('rejects with AlreadyLockedError', (done) => {
        lock1
        .lock()
        .then(() => done(new Error('should have rejected')), (e) => {
          expect(e instanceof AlreadyLockedError).to.be.true;
          done();
        })
        .catch(done);
      });
    });
    context('is not locked', () => {
      it('resolves', (done) => {
        lock1
        .lock()
        .then(() => done(), () => done(new Error('should have resolved')));
      });
    });
  });
  describe('unlock', () => {
    context('is locked by current node', () => {
      beforeEach(() => lock1.lock());
      it('resolves', (done) => {
        lock1
        .unlock()
        .then(() => done(), () => done(new Error('should have resolved')));
      });
    });
    context('is not locked by current node', () => {
      beforeEach(() => lock2.lock());
      it('rejects with LockNotOwnedError', (done) => {
        lock1
        .unlock()
        .then(() => done(new Error('should have rejected')), (e) => {
          expect(e instanceof LockNotOwnedError).to.be.true;
          done();
        })
        .catch(done);
      });
    });
    context('is not locked', () => {
      it('rejects with LockNotOwnedError', (done) => {
        lock1
        .unlock()
        .then(() => done(new Error('should have rejected')), (e) => {
          expect(e instanceof LockNotOwnedError).to.be.true;
          done();
        })
        .catch(done);
      });
    });
  });
  describe('renew', () => {
    context('is locked by current node', () => {
      beforeEach(() => lock1.lock());
      it('resolves', (done) => {
        lock1
        .renew()
        .then(() => done(), () => done(new Error('should have resolved')));
      });
    });
    context('is not locked by current node', () => {
      beforeEach(() => lock2.lock());
      it('rejects with LockNotOwnedError', (done) => {
        lock1
        .renew()
        .then(() => done(new Error('should have rejected')), (e) => {
          expect(e instanceof LockNotOwnedError).to.be.true;
          done();
        })
        .catch(done);
      });
    });
    context('is not locked', () => {
      it('rejects with LockNotOwnedError', (done) => {
        lock1
        .renew()
        .then(() => done(new Error('should have rejected')), (e) => {
          expect(e instanceof LockNotOwnedError).to.be.true;
          done();
        })
        .catch(done);
      });
    });
  });
});
