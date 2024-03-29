import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactType'
import { Update } from './fiberFlags'
import { Lane, Lanes, NoLanes, isSubsetOfLanes, mergeLanes } from './fiberLans'

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
// 消费
export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLanes: Lanes
): {
  memoizedState: State
  skippedUpdateLanes: Lanes
  baseState: State
  baseQueue: null | Update<State>
} => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState,
    baseState,
    baseQueue: null,
    skippedUpdateLanes: NoLanes
  }

  if (pendingUpdate !== null) {
    let update = pendingUpdate

    // 更新后的baseState（有跳过情况下与memoizedState不同）
    let newBaseState = baseState
    // 更新后的baseQueue第一个节点
    let newBaseQueueFirst: Update<State> | null = null
    // 更新后的baseQueue最后一个节点
    let newBaseQueueLast: Update<State> | null = null

    do {
      const updateLane = update.lane

      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // 优先级不足
        const clone = createUpdate(update.action, update.lane)
        if (newBaseQueueLast === null) {
          // 没有被跳过的update
          newBaseQueueFirst = newBaseQueueLast = clone
          // baseState从此开始计算
          newBaseState = result.memoizedState
        } else {
          newBaseQueueLast.next = clone
          newBaseQueueLast = newBaseQueueLast.next
        }
        // 记录跳过的lane
        result.skippedUpdateLanes = mergeLanes(result.skippedUpdateLanes, update.lane)
      } else {
        // 优先级足够
        if (newBaseQueueLast !== null) {
          // 之前有跳过的
          const clone = createUpdate(update.action, update.lane)
          newBaseQueueLast.next = clone
          newBaseQueueLast = newBaseQueueLast.next
        }

        const action = update.action
        if (action instanceof Function) {
          result.memoizedState = action(result.memoizedState)
        } else {
          result.memoizedState = action
        }
      }
      update = update.next as Update<State>
    } while (update !== pendingUpdate)

    if (newBaseQueueLast === null) {
      // 没有跳过的，memoizedState应该与baseState一致
      newBaseState = result.memoizedState
    } else {
      // 形成环状链表
      newBaseQueueLast.next = newBaseQueueFirst
    }
    result.baseState = newBaseState
    result.baseQueue = newBaseQueueLast
  }
  return result
}
