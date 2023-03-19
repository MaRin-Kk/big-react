import path from 'path'
import fs from 'fs'
import ts from 'rollup-plugin-typescript2'
import cjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

const pkgPath = path.resolve(__dirname, '../../packages')
const distPath = path.resolve(__dirname, '../../dist/node_modules')

export const resolvePkgPath = (name, isDist) => {
  return isDist ? `${distPath}/${name}` : `${pkgPath}/${name}`
}

export const getPackageJOSN = (name) => {
  const path = `${resolvePkgPath(name)}/package.json`
  const str = fs.readFileSync(path, { encoding: 'utf-8' })
  console.log(JSON.parse(str))
  return JSON.parse(str)
}

export const getBaseRollupPlugins = ({ alias = { __DEV__: true }, typescript = {} } = {}) => {
  return [replace(alias), cjs(), ts(typescript)]
}
