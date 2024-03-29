import { FiberNode, FiberRootNode, PendingPasssiveEffects } from './fiber'
import {
  ChildDeletion,
  Flags,
  MutationMask,
  NoFlags,
  PassiveMask,
  PassiveEffect,
  Placement,
  Update
} from './fiberFlags'
import {
  appendChildToContainer,
  commitUpdate,
  Container,
  inserChildToContainer,
  Instance,
  removeChild
} from 'hostConfig'
import { FuntionComponent, HostComponent, HostRoot, HostText } from './workTags'
import { Effect, FCUpdateQueue } from './fiberHooks'
import { HookHasEffect } from './hooksEffectTags'

let nextEffect: FiberNode | null = null

export function commitMutationEffects(finishedWork: FiberNode, root: FiberRootNode) {
  nextEffect = finishedWork
  while (nextEffect !== null) {
    // 向下遍历
    const child: FiberNode | null = nextEffect.child

    if ((nextEffect.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags && child !== null) {
      nextEffect = child
    } else {
      // 向上遍历  DFS
      up: while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect, root)
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

const commitMutationEffectsOnFiber = (finishedWork: FiberNode, root: FiberRootNode) => {
  const flags = finishedWork.flags

  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }

  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions) {
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete, root)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }

  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }

  if ((flags & PassiveEffect) !== NoFlags) {
    // 收集回调
    commitPasssiveEffects(finishedWork, root, 'update')
    finishedWork.flags &= ~PassiveEffect
  }
}

function commitPasssiveEffects(fiber: FiberNode, root: FiberRootNode, type: keyof PendingPasssiveEffects) {
  // update  unmount
  if (fiber.tag !== FuntionComponent || (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)) {
    return
  }
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (updateQueue) {
    if (updateQueue.lastEffect === null && __DEV__) {
      console.error('当FC存在PassiveEffect flag 时,不应该存在effect')
    }
    root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect)
  }
}

function commitHookEffectList(flags: Flags, lastEffect: Effect, callback: (effect: Effect) => void) {
  let effect = lastEffect.next as Effect
  do {
    if ((effect.tag & flags) === flags) {
      callback(effect)
    }
    effect = effect.next as Effect
  } while (effect !== lastEffect.next)
}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const destory = effect.destory
    if (typeof destory === 'function') {
      destory()
    }
    effect.tag &= ~HookHasEffect
  })
}

export function commitHookEffectListDestory(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const destory = effect.destory
    if (typeof destory === 'function') {
      destory()
    }
  })
}
export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const create = effect.create
    if (typeof create === 'function') {
      effect.destory = create()
    }
  })
}

function recordHostChildrenToDelete(childrenToDelete: FiberNode[], unmountFiber: FiberNode) {
  // 1.找到第一个root host节点

  let lastOne = childrenToDelete[childrenToDelete.length - 1]
  if (!lastOne) {
    childrenToDelete.push(unmountFiber)
  } else {
    let node = lastOne.sibling
    while (node) {
      if (unmountFiber === node) {
        childrenToDelete.push(node)
      }
      node = node.sibling
    }
  }
  // 2.每找到一个host节点，判断是不是一个
}

function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
  let rootChildrenToDelete: FiberNode[] = []

  //递归子树
  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        // todo 解绑ref
        return
      case HostText:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        return
      case FuntionComponent:
        commitPasssiveEffects(unmountFiber, root, 'unmount')
        return
      default:
        if (__DEV__) {
          console.log('未处理的umount类型', unmountFiber)
        }
    }
  })

  if (rootChildrenToDelete.length !== 0) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent) {
      rootChildrenToDelete.forEach((node) => {
        removeChild(node.stateNode, hostParent)
      })
    }
  }
  childToDelete.return = null
  childToDelete.child = null
}

function commitNestedComponent(root: FiberNode, onCommitUnmount: (fiber: FiberNode) => void) {
  let node = root
  while (true) {
    onCommitUnmount(node)
    if (node.child) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === root) {
      return // 终止条件
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return
      }
      // 向上归
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}
const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn('执行placement 操作', finishedWork)
  }
  // parent DOM
  const hostParent = getHostParent(finishedWork)

  const sibling = getHostSibling(finishedWork)

  if (hostParent) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent, sibling)
  }
}

const getHostSibling = (fiber: FiberNode) => {
  findSibling: while (true) {
    while (fiber.sibling === null) {
      const parent = fiber.return
      if (parent === null || parent.tag === HostComponent || parent.tag === HostRoot) {
        return null
      }
      fiber = parent
    }

    fiber.sibling.return = fiber.return
    fiber = fiber.sibling
    while (fiber.tag !== HostText && fiber.tag !== HostComponent) {
      // 向下遍历
      if ((fiber.flags & Placement) !== NoFlags) {
        continue findSibling
      }
      if (fiber.child === null) {
        continue findSibling
      } else {
        fiber.child.return = fiber
        fiber = fiber.child
      }
    }
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
  }
  if (__DEV__) {
    console.warn('未找到hostParent')
  }
  return null
}

const appendPlacementNodeIntoContainer = (finishedWork: FiberNode, hostParent: Container, before?: Instance) => {
  // fiber host
  if (finishedWork.tag == HostComponent || finishedWork.tag == HostText) {
    if (before) {
      inserChildToContainer(finishedWork.stateNode, hostParent, before)
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode)
    }
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
