/* eslint-disable import/no-extraneous-dependencies */
import localResolve from 'rollup-plugin-local-resolve';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonJS from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import externalGlobals from 'rollup-plugin-external-globals';
import del from 'rollup-plugin-delete';
import json from '@rollup/plugin-json';
import paths from '../paths';
import pkg from '../../package.json';
import CONSTANTS from './constants';

const globals = { 'socket.io-client': 'io' };
const external = ['socket.io-client'];
const BUILD_PATH = paths.appBuild;
const banner = `/* SkylinkJS v${pkg.version} ${new Date().toString()} */`;
// eslint-disable-next-line prefer-destructuring
const BUILD_JS = CONSTANTS.BUILD_JS;

const config = {
  input: paths.appIndexJs,
  output: [
    {
      file: `${BUILD_PATH}/${BUILD_JS.esm.fileName}`,
      format: BUILD_JS.esm.format,
      exports: 'named',
      globals,
      banner,
    },
    {
      file: `${BUILD_PATH}/${BUILD_JS.umd.fileName}`,
      format: BUILD_JS.umd.format,
      exports: 'named',
      name: 'Skylink',
      globals,
      banner,
    },
  ],
  onwarn: (warning, warn) => {
    // skip certain warnings
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    // Use default for everything else
    warn(warning);
  },
  plugins: [
    json({ compact: true }),
    nodeResolve(),
    commonJS({
      strictRequires: true,
    }),
    externalGlobals(globals),
    localResolve(),
    del({
      targets: `${BUILD_PATH}`,
      verbose: true,
    }),
  ],
  external,
};

const configMin = {
  input: paths.appIndexJs,
  output: [
    {
      file: `${BUILD_PATH}/${BUILD_JS.esm.minFileName}`,
      format: BUILD_JS.esm.format,
      exports: 'named',
      globals,
      banner,
    },
    {
      file: `${BUILD_PATH}/${BUILD_JS.umd.minFileName}`,
      format: BUILD_JS.umd.format,
      exports: 'named',
      name: 'Skylink',
      globals,
      banner,
    },
  ],
  onwarn: (warning, warn) => {
    // skip certain warnings
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    // Use default for everything else
    warn(warning);
  },
  plugins: [
    json({ compact: true }),
    nodeResolve(),
    commonJS({
      strictRequires: true,
    }),
    terser({
      // include: [/^.+\.min\.umd\.js$/, /^.+\.min\.js$/],
      // exclude: ['some*'],
      compress: {
        arguments: true,
      },
      mangle: {
        eval: true,
      },
    }),
    externalGlobals(globals),
    localResolve(),
  ],
  external,
};

export default [config, configMin];
