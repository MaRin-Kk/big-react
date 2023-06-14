import { ReactElementType } from 'shared/ReactType'
import { mountChildFibers, recocileChildFibers } from './childrenFibers'
import { FiberNode } from './fiber'
import { renderWithHooks } from './fiberHooks'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import { Fragment, FuntionComponent, HostComponent, HostRoot, HostText } from './workTags'
import { Lane } from './fiberLans'

export const beginWork = (wip: FiberNode, renderLane: Lane) => {
  // 比较子fiberNode
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip, renderLane)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      return null
    case FuntionComponent:
      return updateFuntionComponent(wip, renderLane)
    case Fragment:
      return updateFragment(wip)
    default:
      if (__DEV__) {
        console.warn('beginWork未实现的类型')
      }
      break
  }
  return null
}

function updateFuntionComponent(wip: FiberNode, renderLane: Lane) {
  const nextChildren = renderWithHooks(wip, renderLane)
  recocnileChildren(wip, nextChildren)

  return wip.child
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
  const baseState = wip.memoizedState
  const updateQueue = wip.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending
  updateQueue.shared.pending = null
  const { memoizedState } = processUpdateQueue(baseState, pending, renderLane)
  wip.memoizedState = memoizedState

  const nextChildren = wip.memoizedState

  recocnileChildren(wip, nextChildren)
  return wip.child
}

function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps
  const nextChildren = nextProps.children
  recocnileChildren(wip, nextChildren)

  return wip.child
}

function updateFragment(wip: FiberNode) {
  const nextChildren = wip.pendingProps
  recocnileChildren(wip, nextChildren)

  return wip.child
}

function recocnileChildren(wip: FiberNode, children?: ReactElementType) {
  const current = wip.alternate
  if (current) {
    // update
    wip.child = recocileChildFibers(wip, current?.child, children)
  } else {
    // mount
    wip.child = mountChildFibers(wip, null, children)
  }
}
