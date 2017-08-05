/* global wallaby */
import fs from 'fs';
import path from 'path';
import {expect} from 'chai';
import {importCost as runner, cleanup, JAVASCRIPT, TYPESCRIPT} from '../src';
import {clearSizeCache} from '../src/packageInfo';

function fixture(fileName) {
  const workingFolder = typeof wallaby !== 'undefined' ? path.join(wallaby.localProjectDir, 'test') : __dirname;
  return path.join(workingFolder, 'fixtures', fileName);
}

function whenDone(emitter) {
  return new Promise((resolve, reject) => {
    let start;
    const calculated = [];
    emitter.on('start', packages => {
      expect(start).to.equal(undefined);
      start = packages;
    });
    emitter.on('calculated', packages => calculated.push(packages));
    emitter.on('done', packages => {
      expect(start.length).to.equal(packages.length);
      expect(calculated.length).to.equal(packages.length);
      resolve(packages);
    });
    emitter.on('error', reject);
  });
}

function importCost(fileName, language = undefined) {
  language = language ? language : fileName.split('.').pop() === 'js' ? JAVASCRIPT : TYPESCRIPT;
  return runner(fileName, fs.readFileSync(fileName, 'utf-8'), language);
}

function sizeOf(packages, name) {
  return packages.filter(x => x.name === name).shift().size;
}

async function test(fileName) {
  const packages = await whenDone(importCost(fixture(fileName)));
  expect(sizeOf(packages, 'chai')).to.be.greaterThan(500);
}

describe('importCost', () => {
  beforeEach(() => clearSizeCache());
  afterEach(() => clearSizeCache());
  afterEach(() => cleanup());

  it('calculates size of require in javascript', () => test('require.js'));
  it('calculates size of require in typescript', () => test('require.ts'));
  it('calculates size of template require in javascript', () => test('require-template.js'));
  it('calculates size of template require in typescript', () => test('require-template.ts'));
  it('calculates size of import in javascript', () => test('import.js'));
  it('calculates size of import in typescript', () => test('import.ts'));
  it('calculates size of legacy import in javascript', () => test('import-legacy.js')); //not supported in typescript
  it('calculates size of namespace import in javascript', () => test('import-namespace.js'));
  it('calculates size of namespace import in typescript', () => test('import-namespace.ts'));
  it('calculates size of specifiers import in javascript', () => test('import-specifiers.js'));
  it('calculates size of specifiers import in typescript', () => test('import-specifiers.ts'));
  it('calculates size of mixed import in javascript', () => test('import-mixed.js'));
  it('calculates size of mixed import in typescript', () => test('import-mixed.ts'));

  it('results in 0 if dependency is missing', async () => {
    const packages = await whenDone(importCost(fixture('failed-missing.js')));
    expect(sizeOf(packages, 'sinon')).to.equal(0);
  });
  it('results in 0 if bundle fails', async () => {
    const packages = await whenDone(importCost(fixture('failed-bundle.js')));
    expect(sizeOf(packages, 'jest')).to.equal(0);
  });

  it('errors on broken javascript', () => {
    return expect(whenDone(importCost(fixture('incomplete.bad_js')))).to.be.rejected;
  });
  it('errors on broken typescript', () => {
    return expect(whenDone(importCost(fixture('incomplete.bad_ts')))).to.be.rejected;
  });
  it('completes with empty array for unknown file type', async () => {
    const packages = await whenDone(importCost(fixture('require.js'), 'flow'));
    expect(packages).to.eql([]);
  });
});
