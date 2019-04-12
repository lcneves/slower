'use strict';

const assert = require('assert');
const Slower = require('..');

describe('Slower tests', () => {
  let slower;

  beforeEach(() => {
    slower = new Slower({
    });
  });

  afterEach(() => {
    slower.stop();
  });

  it('instantiates', () => {
  });

  it('starts', () => {
  });

  it('pauses', () => {
  });

  it('restarts', () => {
  });

  it('stops', () => {
  });
});
