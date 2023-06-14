import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactType'
import { Update } from './fiberFlags'
import { Lane } from './fiberLans'

export interface Update<State> {
  action: Action<State>
  lane: Lane
  next: Update<any> | null
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}
export const createUpdate = <State>(action: Action<State>, lane: Lane): Update<State> => {
  return {
    action,
    lane,
    next: null
  }
}

export const createUpdateQueue = <Action>() => {
  return {
    shared: {
      pending: null
    },
    dispatch: null
  } as UpdateQueue<Action>
}

// 增加update
export const enqueueUpdate = <Action>(updateQueue: UpdateQueue<Action>, update: Update<Action>) => {
  const pending = (updateQueue.shared.pending = update)
  if (pending === null) {
    // pending =   a => a
    update.next = update
  } else {
    // pending b => a => b
    // pending c => a => b => c
    update.next = pending.next
    pending.next = update
  }
  updateQueue.shared.pending = update
}

// 正在消费的update
export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLane: Lane
): { memoizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = { memoizedState: baseState }

  if (pendingUpdate !== null) {
    // 第一个update
    const first = pendingUpdate.next
    let pending = pendingUpdate.next as Update<any>

    do {
      const updateLane = pending?.lane
      if (updateLane === renderLane) {
        const action = pending.action
        if (action instanceof Function) {
          baseState = action(baseState)
        } else {
          baseState = action
        }
      } else {
        if (__DEV__) {
          console.error('不应该进入updateLane !== renderLane这个逻辑')
        }
      }
      pending = pending?.next as Update<any>
    } while (pending !== first)
  }
  result.memoizedState = baseState
  return result
}
