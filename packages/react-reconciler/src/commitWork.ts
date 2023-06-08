import { FiberNode, FiberRootNode } from './fiber'
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from './fiberFlags'
import {
  appendChildToContainer,
  commitUpdate,
  Container,
  inserChildToContainer,
  Instance,
  removeChild
} from 'hostConfig'
import { FuntionComponent, HostComponent, HostRoot, HostText } from './workTags'
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

  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions) {
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }
}

function commitDeletion(childToDelete: FiberNode) {
  let rootHostNode: FiberNode | null = null

  //递归子树
  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        // todo 解绑ref
        return
      case HostText:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        return
      case FuntionComponent:
        return

      default:
        if (__DEV__) {
          console.log('未处理的umount类型', unmountFiber)
        }
    }
  })

  if (rootHostNode) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent) {
      removeChild((rootHostNode as FiberNode).stateNode, hostParent)
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
