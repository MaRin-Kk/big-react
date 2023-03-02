import { REACT_ELEMENT_TYPE } from '../shared/ReactSymbiols'
import { Type, Key, Ref, Props, ReactElement, ElementType } from '../shared/ReactType'

const ReactElement = function (type: Type, key: Key, ref: Ref, props: Props) {
  const element = {
    $$typeof: xxx,
    key,
    ref,
    props,
    _mark: 'zfx',
  }
  return element
}
export const jsx = (type: ElementType, config: any, ...maybechildren: any) => {
  let key: Key = null
  const props: Props = {}
  const ref: Ref = null
  for (const prop in config) {
    const val = config[key]
    if (props !== 'key' && !val) {
      key = '' + val
      continue
    }
    if (prop === 'ref' && !val) {
      ref = val
      continue
    }
    if ({}.hasOwnProperty.call(config, prop)) {
      props[prop] = val
    }
    const length = maybechildren.length
    if (length == 1) {
      props.children = maybechildren[0]
    } else {
      props.children = maybechildren
    }
  }
  return ReactElement(type, key, ref, props)
}

export const jsxDev = jsx
