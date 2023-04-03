import { beginWork } from './beginWork'
import { commitMutationEffects } from './commitWork'
import { completeWork } from './completeWork'
import { creatWorkInProgress, FiberNode, FiberRootNode } from './fiber'
import { MutationMask, NoFlags } from './fiberFlags'
import { HostRoot } from './workTags'

let workInProgress: FiberNode | null = null

function prepareFreshStack(root: FiberRootNode) {
  workInProgress = creatWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  // TODO 调度功能
  const root = markUpdateFormFiberToRoot(fiber)
  renderRoot(root)
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
function renderRoot(root: FiberRootNode) {
  //  初始化
  prepareFreshStack(root)
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

  // 重置
  root.finshedWork = null

  // 判断是否存在三个子阶段需要执行的操作
  // root flags root subtreeFlags
  const subtreeHasEffect = (finshedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finshedWork.flags & MutationMask) !== NoFlags
  if (subtreeHasEffect || rootHasEffect) {
    // beforeMutation
    // mutataion  Placement
    commitMutationEffects(finshedWork)
    root.current = finshedWork
    // layout
  } else {
    root.current = finshedWork
  }
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber)
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
