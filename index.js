/*
 * Slower
 * Copyright 2019 Lucas Neves <lcneves@gmail.com>
 *
 * Adapts the pace of your requests to the resource's feedback.
 */

'use strict';

class Slower {
  constructor (options) {
    function parseTime (t) {
      if (typeof t === 'number' && t >= 0)
        return t;

      try {
        const ms
          = t.endsWith('h') ? parseInt(ms.slice(0, -1), 10) * 3600000
          : t.endsWith('m') ? parseInt(ms.slice(0, -1), 10) * 60000
          : t.endsWith('s') ? parseInt(ms.slice(0, -1), 10) * 1000
          : t.endsWith('ms') ? parseInt(ms.slice(0, -2), 10)
          : null;

        if (typeof ms !== 'number' || ms < 0)
          throw new Error();
      } catch (err) {
        throw new Error('Invalid time format!\n' + t);
      }
    }

    if (!options || typeof options !== 'object')
      throw new Error('Parameter must be an object!');

    if (typeof options.task !== 'function')
      throw new Error('Parameter "task" must be a function!');

    for (let f of [ 'errorHandler', 'timeoutHandler' ]) {
      if (options[f] && typeof options[f] !== 'function')
        throw new Error(`Parameter "${f}", if passed, must be a function!`);
    }

    for (let p of [
      'minInterval',
      'baseInterval',
      'maxInterval',
      'fasterAfter',
      'delayOnFailure',
    ]) {
      if (opts[p] !== undefined)
        opts[p] = parseTime(opts[p]);
    }

    const opts = {
      errorHandler: (err) => {
        if (err.message === '__timeout')
          console.info('Task has timed out!');
        else
          console.error(err);
      },
      timeoutHandler: opts.errorHandler,
      taskTimeLimit: null,
      minInterval: 0,
      baseInterval: 1000, // 1 second
      maxInterval: 60000, // 1 minute
      fasterAfter: 60000,
      delayOnFailure: 0,
      ...options
    };

    this._props = {
      errorHandler: opts.errorHandler,
      timeoutHandler: opts.timeoutHandler,
      task: opts.task,
      taskTimeLimit: opts.taskTimeout,
      delayOnFailure: opts.delayOnFailure,
      minInterval: opts.minInterval,
      baseInterval: opts.baseInterval,
      maxInterval: opts.maxInterval,
      window: opts.window,
      forgetLimit: 180000000, // 5 hours
    };

    this._state = {
      currentInterval: opts.baseInterval,
      rateLimited: opts.minInterval,
      isRunning: false,
      hasPendingTask: false,
      hasFailure: false,
      lastRun: new Date(0),
      lastRateLimit: new Date(0),
      restartTimeout: null,
      nextRunTimeout: null,
      taskTimeout: null,
    };

    this.status = {
      ok: 0,
      rateLimited: 1,
      failure: 2,
    };

    if (opts.startImmediately)
      this.start();
  }

  _updateInterval (statusCode) {
    const now = new Date();
    const [ s, p ] = [ this._state, this._props ];

    switch (statusCode) {
      case this.status.ok:
        if (p.forgetLimit && p.forgetLimit
        if (now - s.lastRateLimit >= p.window)
          s.currentInterval = (s.currentInterval + s.rateLimited) / 2;
        break;
      case this.status.rateLimited:
        break;
      case this.status.failure:
        break;
      default:
        throw new Error('Invalid status code: ' + statusCode);
  }

  stop () {
    clearTimeout(this._state.restartTimeout);
    clearTimeout(this._state.nextRunTimeout);
    this._state.isRunning = false;
  }

  pause (time) {
    if (typeof time !== 'number')
      throw new Error('Argument must be a number (milliseconds to pause)!');

    const self = this;
    this.stop();
    this._state.restartTimeout = setTimeout(() => self.start(), time);
  }
  
  _run () {
    const [ self, p, s ] = [ this, this._props, this._state ];

    if (!s.isRunning || s.hasPendingTask)
      return;

    s.hasPendingTask = true;
    s.lastRun = new Date();

    const raceArr = [ p.task() ];
    if (p.taskTimeLimit) {
      raceArr.push(new Promise((ignoreResolve, reject) => {
        s.taskTimeout = setTimeout(() => reject('__timeout'), p.taskTimeLimit);
      }));
    }

    Promise.race(raceArr)
      .then(status => {
        s._updateRegime(status);
      })
      .catch(err => {
        if (err.message === '__timeout')
          p.timeoutHandler(err);
        else
          p.errorHandler(err)
      })
      .finally(() => {
        clearTimeout(s.taskTimeout);

        if (s.isRunning) {
          const duration = new Date() - s.lastRun;
          const delay = s.regime.interval - duration;
          if (s.hasFailure) delay += p.delayOnFailure;
          delay = Math.max(delay, 0);

          s.nextRunTimeout = setTimeout(() => self._run(), delay);
        }

        s.hasPendingTask = false;
        s.hasFailure = false;
      });
  }

  start () {
    this.stop();
    this._state.isRunning = true;
    this._state.lastRateLimit = new Date();
    this._run();
  }
}

module.exports = Slower;
