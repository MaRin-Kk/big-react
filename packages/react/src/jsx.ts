import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from '../../shared/ReactSymbiols'
import { Type, Key, Ref, Props, ReactElementType, ElementType } from '../../shared/ReactType'

const ReactElement = function (type: Type, key: Key, ref: Ref, props: Props): ReactElementType {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,
    key,
    type,
    ref,
    props,
    _mark: 'zfx'
  }
  return element
}

export const jsx = (type: ElementType, config: any, ...maybechildren: any) => {
  let key: Key = null
  let ref: Ref = null
  const props: Props = {}
  for (const prop in config) {
    const val = config[prop]
    if (props === 'key' && val !== undefined) {
      key = '' + val
      continue
    }
    if (prop === 'ref' && val !== undefined) {
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

export const jsxDEV = (type: ElementType, config: any) => {
  let key: Key = null
  let ref: Ref = null
  const props: Props = {}
  for (const prop in config) {
    const val = config[prop]
    if (props === 'key' && val !== undefined) {
      key = '' + val
      continue
    }
    if (prop === 'ref' && val !== undefined) {
      ref = val
      continue
    }
    if ({}.hasOwnProperty.call(config, prop)) {
      props[prop] = val
    }
  }
  return ReactElement(type, key, ref, props)
}

export const Fragment = REACT_FRAGMENT_TYPE
