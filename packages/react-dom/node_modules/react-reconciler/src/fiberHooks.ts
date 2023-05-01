import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import internals from 'shared/internals'
import { Action, Type } from 'shared/ReactType'
import { FiberNode } from './fiber'
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue } from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'

let currenlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null

interface Hook {
  memoizedState: any
  updateQuque: unknown
  next: Hook | null
}

const { currentDispatcher } = internals

export function renderWithHooks(wip: FiberNode) {
  // 赋值操作
  currenlyRenderingFiber = wip
  const current = wip.alternate
  if (current) {
    // update
  } else {
    // mount
    currentDispatcher.current = HookDispatcherOnmount
  }
  const Component = wip.type
  const props = wip.pendingProps
  const children = Component(props)

  // 重置操作
  currenlyRenderingFiber = null
  return children
}

const HookDispatcherOnmount: Dispatcher = {
  useState: mountState
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
  }
  return workInProgressHook
}
