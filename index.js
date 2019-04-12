/*
 * Slower
 * Copyright 2019 Lucas Neves <lcneves@gmail.com>
 *
 * Adapts the pace of your requests to the resource's feedback.
 */

'use strict';

class Slower {
  constructor (options) {
    if (!options || typeof options !== 'object')
      throw new Error('Parameter must be an object!');

    if (typeof options.task !== 'function')
      throw new Error('Parameter "task" must be a function!');

    if (opts.regimes !== undefined && !Array.isArray(opts.regimes))
      throw new Error('Parameter "regimes", if passed, must be Array!');

    for (let f of [ 'errorHandler', 'timeoutHandler' ]) {
      if (options[f] && typeof options[f] !== 'function')
        throw new Error(`Parameter "${f}", if passed, must be a function!`);
    }

    const opts = {
      errorHandler: (err) => console.error(err),
      timeoutHandler: opts.errorHandler,
      taskTimeLimit: null,
      regimes: [ { } ],
      ...options
    };

    this._props = {
      errorHandler: opts.errorHandler,
      timeoutHandler: opts.timeoutHandler,
      task: opts.task,
      taskTimeLimit: opts.taskTimeout,
      regimes: opts.regimes,
    }

    this._state = {
      regime: this._props.regimes[0],
      isRunning: false,
      hasPendingTask: false,
      lastRun: new Date(0),
      restartTimeout: null,
      nextRunTimeout: null,
      taskTimeout: null,
    };

    if (opts.startImmediately)
      this.start();
  }

  _updateRegime (status) {
    //TODO
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
          self.timeoutHandler(err);
        else
          self.errorHandler(err)
      })
      .finally(() => {
        clearTimeout(s.taskTimeout);

        if (s.isRunning) {
          const duration = new Date() - s.lastRun;
          const delay = duration < s.regime.interval
            ? s.regime.interval - duration : 0;

          s.nextRunTimeout = setTimeout(() => self._run(), delay);
        }

        s.hasPendingTask = false;
      });
  }

  start () {
    this.stop();
    this._state.isRunning = true;
    this._run();
  }
}

module.exports = Slower;
