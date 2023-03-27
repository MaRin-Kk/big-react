import { FiberNode, FiberRootNode } from './fiber'
import { MutationMask, NoFlags, Placement } from './fiberFlags'
import { appendChildToContainer, Container } from 'hostConfig'
import { HostComponent, HostRoot, HostText } from './workTags'
let nextEffect: FiberNode | null = null
export function commitMutationEffects(finshedWork: FiberNode) {
  nextEffect = finshedWork
  while (nextEffect !== null) {
    // 向下遍历
    const child: FiberNode | null = nextEffect.child

    if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
      nextEffect = child
    } else {
      // 向上遍历  DFS
      up: while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect)
        const sibling: FiberNode | null = nextEffect.sibling
        if (sibling !== null) {
          nextEffect = sibling
          break up
        }
        nextEffect = nextEffect.return
      }
    }
  }
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
  const flags = finishedWork.flags

  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }
}

const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn('执行placement 操作', finishedWork)
  }
  // parent DOM
  const hostParent = getHostParent(finishedWork)
  if (hostParent) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent)
  }
}

const getHostParent = (fiber: FiberNode): Container | null => {
  let parent = fiber.return

  while (parent) {
    const parentTag = parent.tag

    if (parentTag == HostComponent) {
      return parent.stateNode as Container
    }
    if (parentTag == HostRoot) {
      return (parent.stateNode as FiberRootNode).container
    }
    parent = parent.return
    if (__DEV__) {
      console.warn('未找到hostParent')
    }
  }
  return null
}

const appendPlacementNodeIntoContainer = (finishedWork: FiberNode, hostParent: Container) => {
  // fiber host
  if (finishedWork.tag == HostComponent || finishedWork.tag == HostText) {
    appendChildToContainer(hostParent, finishedWork.stateNode)
    return
  }

  const child = finishedWork.child
  if (child !== null) {
    // 孩子节点
    appendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling
    while (sibling !== null) {
      // 兄弟节点
      appendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
