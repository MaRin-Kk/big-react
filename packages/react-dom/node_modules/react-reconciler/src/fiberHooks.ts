import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import internals from 'shared/internals'
import { Action, Type } from 'shared/ReactType'
import { FiberNode } from './fiber'
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue, UpdateQueue } from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'

let currenlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null

interface Hook {
  memoizedState: any
  updateQuque: unknown
  next: Hook | null
}

const { currentDispatcher } = internals

export function renderWithHooks(wip: FiberNode) {
  // 赋值操作
  currenlyRenderingFiber = wip

  // 重置
  wip.memoizedState = null

  const current = wip.alternate
  if (current) {
    // update
    currentDispatcher.current = HookDispatcherOnUpdate
  } else {
    // mount
    currentDispatcher.current = HookDispatcherOnMount
  }
  const Component = wip.type
  const props = wip.pendingProps
  const children = Component(props)
  // 重置操作
  currenlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null

  return children
}

const HookDispatcherOnMount: Dispatcher = {
  useState: mountState
}
const HookDispatcherOnUpdate: Dispatcher = {
  useState: updateState
}
function mountState<State>(initialState: (() => State) | State): [State, Dispatch<State>] {
  // 找到当前useState 对应的hook数据
  const hook = mountWorkInProgressHook()
  let memoizedState
  if (initialState instanceof Function) {
    memoizedState = initialState()
  } else {
    memoizedState = initialState
  }
  const queue = createUpdateQueue<State>()
  hook.updateQuque = queue
  hook.memoizedState = memoizedState

  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currenlyRenderingFiber, queue)
  queue.dispatch = dispatch

  return [memoizedState, dispatch]
}

function updateState<State>(): [State, Dispatch<State>] {
  // 找到当前useState 对应的hook数据
  const hook = updateWorkInProgressHook()

  // 计算新state的逻辑
  const queue = hook.updateQuque as UpdateQueue<State>
  const pending = queue.shared.pending
  if (pending !== null) {
    const { memoizedState } = processUpdateQueue(hook.memoizedState, pending)
    hook.memoizedState = memoizedState
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function dispatchSetState<State>(fiber: FiberNode, updateQueue: UpdateQueue<State>, action: Action<State>) {
  const update = createUpdate(action)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber)
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQuque: null,
    next: null
  }
  if (workInProgressHook === null) {
    // mount 时第一个hook
    if (currenlyRenderingFiber === null) {
      throw new Error('请在函数组件内部使用hook')
    } else {
      workInProgressHook = hook
      currenlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount 后续的hook
    workInProgressHook.next = hook
    workInProgressHook = hook
  }
  return workInProgressHook
}

function updateWorkInProgressHook(): Hook {
  let nextCurrentHook: Hook | null

  // FC update时的第一个hook
  if (currentHook === null) {
    const current = currenlyRenderingFiber?.alternate
    if (current !== null) {
      nextCurrentHook = current?.memoizedState
    } else {
      nextCurrentHook = null
    }
  } else {
    // FC update时后续的hook
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    throw new Error(`组件${currenlyRenderingFiber?.type}本次执行时比上次执行时多`)
  }

  currentHook = nextCurrentHook as Hook
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQuque: currentHook.updateQuque,
    next: null
  }
  if (workInProgressHook === null) {
    // mount 时第一个hook
    if (currenlyRenderingFiber === null) {
      throw new Error('请在函数组件内部使用hook')
    } else {
      workInProgressHook = newHook
      currenlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount 后续的hook
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }
  return workInProgressHook
}
