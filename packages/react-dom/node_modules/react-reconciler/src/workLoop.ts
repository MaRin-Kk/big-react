import { scheduleMicroTask } from 'hostConfig'
import { unstable_scheduleCallback as scheduleCallback, unstable_NormalPriority as NomalPriority } from 'scheduler'
import { beginWork } from './beginWork'
import {
  commitHookEffectListCreate,
  commitHookEffectListDestory,
  commitHookEffectListUnmount,
  commitMutationEffects
} from './commitWork'
import { completeWork } from './completeWork'
import { creatWorkInProgress, FiberNode, FiberRootNode, PendingPasssiveEffects } from './fiber'
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags'
import { getHeightPriortyLane, Lane, markRootFinished, mergeLanes, NoLane, SyncLane } from './fiberLans'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { HostRoot } from './workTags'
import { HookHasEffect, Passive } from './hooksEffectTags'

let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
let rootDoesHasPassEffects: boolean = false

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  workInProgress = creatWorkInProgress(root.current, {})
  wipRootRenderLane = lane
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  // TODO 调度功能
  const root = markUpdateFormFiberToRoot(fiber)
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

// schedule调度阶段入口
function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHeightPriortyLane(root.pendingLanes)
  if (updateLane === NoLane) {
    return
  }
  if (updateLane === SyncLane) {
    // 同步优先级 微任务调度
    if (__DEV__) {
      console.log('在微任务中调度', updateLane)
    }
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // 其它优先级 宏任务调度
  }
}
function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

function markUpdateFormFiberToRoot(fiber: FiberNode) {
  //节点
  let node = fiber
  //父节点
  let parent = node.return
  while (parent) {
    node = parent
    parent = node.return
  }
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}
function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
  const nextLane = getHeightPriortyLane(lane)

  if (nextLane !== SyncLane) {
    // 其它比syncLane低的优先级
    //  NoLane
    ensureRootIsScheduled(root)
    return
  }

  if (__DEV__) {
    console.warn('render阶段开始')
  }
  // 初始化
  prepareFreshStack(root, lane)
  do {
    try {
      workLoop()
      break
    } catch (e) {
      console.warn('workLoop发生错误', e)
      workInProgress = null
    }
  } while (true)

  const finshedWork = root.current.alternate
  root.finshedWork = finshedWork
  root.finishedLane = lane
  wipRootRenderLane = NoLane

  commitRoot(root)
}

function commitRoot(root: FiberRootNode) {
  const finshedWork = root.finshedWork
  if (finshedWork === null) {
    return
  }
  if (__DEV__) {
    console.warn('commit阶段开始', finshedWork)
  }

  const lane = root.finishedLane

  if (lane === NoLane && __DEV__) {
    console.error('commit阶段finishLane不应该是NoLane')
  }
  // 重置
  root.finshedWork = null
  root.finishedLane = NoLane

  markRootFinished(root, lane)

  if ((finshedWork.flags & PassiveMask) !== NoFlags || (finshedWork.subtreeFlags & PassiveMask) !== NoFlags) {
    if (!rootDoesHasPassEffects) {
      rootDoesHasPassEffects = true
      // 调度副作用
      scheduleCallback(NomalPriority, () => {
        // 执行副作用
        flushPassiveEffects(root.pendingPasssiveEffects)
        return
      })
    }
  }
  // 判断是否存在三个子阶段需要执行的操作
  // root flags root subtreeFlags
  const subtreeHasEffect = (finshedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finshedWork.flags & MutationMask) !== NoFlags
  if (subtreeHasEffect || rootHasEffect) {
    // beforeMutation
    // mutataion  Placement
    commitMutationEffects(finshedWork, root)
    root.current = finshedWork
    // layout
  } else {
    root.current = finshedWork
  }

  rootDoesHasPassEffects = false
  ensureRootIsScheduled(root)
}

function flushPassiveEffects(pendingPasssiveEffects: PendingPasssiveEffects) {
  pendingPasssiveEffects.unmount.forEach((effect) => {
    commitHookEffectListUnmount(Passive, effect)
  })
  pendingPasssiveEffects.unmount = []

  pendingPasssiveEffects.update.forEach((effect) => {
    commitHookEffectListDestory(Passive | HookHasEffect, effect)
  })

  pendingPasssiveEffects.update.forEach((effect) => {
    commitHookEffectListCreate(Passive | HookHasEffect, effect)
  })
  pendingPasssiveEffects.update = []
  flushSyncCallbacks()
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber, wipRootRenderLane)
  fiber.memoizedProps = fiber.pendingProps
  if (next === null) {
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber

  do {
    completeWork(node)
    if (node.sibling !== null) {
      workInProgress = node.sibling
      return
    }
    node = node.return
    workInProgress = node
  } while (node !== null)
}
