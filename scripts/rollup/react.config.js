import { getPackageJOSN, resolvePkgPath, getBaseRollupPlugins } from './utils'
const { name, module } = getPackageJOSN('react')
//react 包的路径
const pkgPath = resolvePkgPath(name)
//react 产物路径
const pkgDistPath = resolvePkgPath(name, true)

export default [
  {
    input: `${pkgPath}/${module}`,
    output: {
      file: `${pkgDistPath}/index.js`,
      name: 'index.js',
      format: 'umd',
    },
    plugins: getBaseRollupPlugins(),
  },
]
