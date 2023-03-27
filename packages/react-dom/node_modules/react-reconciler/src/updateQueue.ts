import { Action } from 'shared/ReactType'
import { Update } from './fiberFlags'

export interface Update<State> {
  action: Action<State>
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
}
export const creatUpdate = <State>(action: Action<State>): Update<State> => {
  return {
    action
  }
}

export const creatUpdateQueue = <Action>() => {
  return {
    shared: {
      pending: null
    }
  } as UpdateQueue<Action>
}

// 增加update
export const enqueueUpdate = <Action>(updateQueue: UpdateQueue<Action>, update: Update<Action>) => {
  updateQueue.shared.pending = update
}

// 正在消费的update
export const processUpdateQueue = <State>(
  baseUpdate: State,
  pendingUpdate: Update<State> | null
): { memoizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = { memoizedState: baseUpdate }

  if (pendingUpdate) {
    const action = pendingUpdate.action
    if (action instanceof Function) {
      result.memoizedState = action(baseUpdate)
    } else {
      result.memoizedState = action
    }
  }

  return result
}
