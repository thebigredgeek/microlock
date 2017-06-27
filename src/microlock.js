import EventEmitter from 'events';
import Promise from 'bluebird';



// Error helper
function ExtendableError(message){
  Error.apply(this, arguments);
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = (new Error(message)).stack;
  }
}

ExtendableError.prototype = Object.create(Error.prototype);

Object.setPrototypeOf(ExtendableError, Error);







// Errors
export class EtcdClientRequiredError extends ExtendableError {
  constructor () {
    super('etcd client parameter is required');
  }
}

export class KeyRequiredError extends ExtendableError {
  constructor () {
    super('key parameter of type String is required');
  }
}

export class NodeIdRequiredError extends ExtendableError {
  constructor () {
    super('node_id parameter of type String is required')
  }
}

export class InvalidTtlError extends ExtendableError {
  constructor () {
    super('ttl parameter must be of type Number');
  }
}

export class AlreadyLockedError extends ExtendableError {
  constructor (key) {
    super(`Lock "${key}" is already locked`);
  }
}

export class LockNotOwnedError extends ExtendableError {
  constructor (key, node_id) {
    super(`Lock "${key}" is not owned by node "${node_id}"`);
  }
}








// Events
export const events = {
  locked: 'locked',
  unlocked: 'unlocked',
  error: 'error'
};







//Microlock
export default class Microlock extends EventEmitter {
  constructor (etcd, key, node_id, ttl = 1) {

    if (!etcd) throw new EtcdClientRequiredError();
    if (typeof key !== 'string') throw new KeyRequiredError();
    if (typeof node_id !== 'string') throw new NodeIdRequiredError();
    if (isNaN(ttl)) throw new InvalidTtlError();

    super();

    this.__etcd = etcd;
    this.__key = key;
    this.__node_id = node_id;
    this.__ttl = ttl < 1 ? 1 : ttl; //Require at least one second for ttl for stability of lock/unlock

    this.__watcher = this.__etcd.watcher(key);

    this.__watcher.on('compareAndDelete', () => this.emit(events.unlocked));
    this.__watcher.on('change', (v) => {
      if (v.node && v.node.ttl) this.emit(events.locked);
    });
  }

  // Private methods
  __throwAlreadyLocked () {
    const e = new AlreadyLockedError(this.__key);
    this.emit(events.error, e)
    throw e;
  }
  __throwLockNotOwned () {
    const e = new LockNotOwnedError(this.__key, this.__node_id);
    this.emit(events.error, e);
    throw e;
  }


  // Public methods
  destroy () {
    this.__watcher.stop();
    this.removeAllListeners();
  }

  lock () {
    return new Promise((resolve, reject) => {
      return this.__etcd.set(this.__key, this.__node_id, {
        ttl: this.__ttl,
        prevExist: false
      }, (err, val) => {
        if (err) return reject(err);
        return resolve(val)
      });
    })
    .catch((e) => {
      // Key already exists
      if (e.errorCode === 105) {
        this.__throwAlreadyLocked();
      }
      throw e;
    });
  }

  unlock () {
    return new Promise((resolve, reject) => {
      return this.__etcd.compareAndDelete(this.__key, this.__node_id, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    })
    .catch((e) => {
      // KeyNotFound or CompareFailed
      if (e.errorCode === 100 || e.errorCode === 101) {
        this.__throwLockNotOwned();
      }
      throw e;
    });
  }

  renew () {
    return new Promise((resolve, reject) => {
      return this.__etcd.set(this.__key, null, {
        prevValue: this.__node_id,
        refresh: true,
        ttl: this.__ttl
      }, (err, val) => {
        if (err) return reject(err);
        return resolve(val);
      })
    })
    .catch((e) => {
      // KeyNotFound or CompareFailed
      if (e.errorCode === 100 || e.errorCode === 101) {
        this.__throwLockNotOwned();
      }
      throw e;
    });
  }
}
