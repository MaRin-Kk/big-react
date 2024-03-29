import { Action } from 'shared/ReactType'

export interface Dispatcher {
  useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>]
  useEffect: (callback: () => void | void, deps: any[] | void) => void
}

export type Dispatch<State> = (action: Action<State>) => void

const currentDispatcher: { current: Dispatcher | null } = {
  current: null
}

export const resolveDispatcher = () => {
  const dispatcher = currentDispatcher.current
  if (dispatcher === null) {
    throw new Error('hooks只能在函数中执行')
  }
  return dispatcher
}
export default currentDispatcher
