import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbiols'
import { Props, ReactElementType } from 'shared/ReactType'
import { creatFiberFromElement, creatFiberFromFragment, creatWorkInProgress, FiberNode } from './fiber'
import { ChildDeletion, Placement } from './fiberFlags'
import { Fragment, HostText } from './workTags'
import { Key } from 'react'

type ExistingChildren = Map<string | number, FiberNode>

function ChildReconciler(shoukdTrackEffects: boolean) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shoukdTrackEffects) {
      return
    }
    const deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      deletions.push(childToDelete)
    }
  }

  function deleteRemainingChildren(returnFiber: FiberNode, currentFirstFiber: FiberNode | null) {
    if (!shoukdTrackEffects) {
      return
    }
    let childToDelete = currentFirstFiber

    while (childToDelete) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
  }

  function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElementType) {
    // 根据element 创建fiber 返回

    const key = element.key
    while (currentFiber !== null) {
      //update
      if (currentFiber.key === key) {
        //key相同
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (currentFiber.type === element.type) {
            let props = element.props
            if (element.type === REACT_FRAGMENT_TYPE) {
              props = element.props.children
            }
            //type相同
            const existing = useFiber(currentFiber, props)
            existing.return = returnFiber
            // 当前节点可复用，标记剩下的节点删除
            deleteRemainingChildren(returnFiber, currentFiber.sibling)
            return existing
          }
          //  key相同 ，type不同。删掉所有旧的
          deleteRemainingChildren(returnFiber, currentFiber)
          break
        } else {
          if (__DEV__) {
            console.warn('还未实现的react类型', element)
            break
          }
        }
      } else {
        // key不同
        deleteChild(returnFiber, currentFiber)
        currentFiber = currentFiber.sibling
      }
    }
    let fiber
    if (element.type === REACT_ELEMENT_TYPE) {
      fiber = creatFiberFromFragment(element.props.children, key)
    } else {
      fiber = creatFiberFromElement(element)
    }

    fiber.return = returnFiber
    return fiber
  }

  function reconcileTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {
    // 根据element 创建fiber 返回
    while (currentFiber) {
      if (currentFiber.tag === HostText) {
        // 类型没变可以服用
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        deleteRemainingChildren(currentFiber, currentFiber.sibling)
        return existing
      }
      deleteChild(returnFiber, currentFiber)
      currentFiber = currentFiber.sibling
    }
    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber
    return fiber
  }

  function reconcileChildrenArray(returnFiber: FiberNode, currentFirstFiber: FiberNode | null, newChild: any[]) {
    // 最后一个可复用fiber在current 中的index
    let lastPlacedIndex: number = 0
    // 创建的最后一个fiber
    let lastNewFiber: FiberNode | null = null
    // 创建的最后一个fiber
    let firstNewFiber: FiberNode | null = null

    // 1.将current 保存在Map中
    const existingChildren: ExistingChildren = new Map()

    let current = currentFirstFiber

    while (current) {
      const keyToUse = current.key ? current.key : current.index
      existingChildren.set(keyToUse, current)
      current = current.sibling
    }

    // 2.编辑newChild 寻找是否可复用
    for (let i = 0; i < newChild.length; i++) {
      const after = newChild[i]

      const newFiber = updateFormMap(returnFiber, existingChildren, i, after)
      if (newFiber === null) {
        continue
      }
      // 3.标记移动还是插入
      newFiber.index = i
      newFiber.return = returnFiber
      if (lastNewFiber === null) {
        lastNewFiber = newFiber
        firstNewFiber = newFiber
      } else {
        lastNewFiber.sibling = newFiber
        lastNewFiber = lastNewFiber.sibling
      }
      if (!shoukdTrackEffects) {
        continue
      }
      const current = newFiber.alternate
      if (current) {
        if (current.index < lastPlacedIndex) {
          // 移动
          newFiber.flags |= Placement
          continue
        } else {
          // 不移动
          lastPlacedIndex = current.index
        }
      } else {
        // mount
        newFiber.flags |= Placement
      }
    }
    // 4.将Map 剩下的标记为删除
    existingChildren.forEach((v) => {
      deleteChild(returnFiber, v)
    })

    return firstNewFiber
  }

  function updateFormMap(
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    index: number,
    element: any
  ): FiberNode | null {
    const keyToUse = element.key || index
    const before = existingChildren.get(keyToUse)

    if (before && before.tag === HostText) {
      existingChildren.delete(keyToUse)
      return useFiber(before, { content: element + ' ' })
    }
    if (typeof element === 'object' && element) {
      if (Array.isArray(element)) {
        return updateFragment(returnFiber, before, element, keyToUse, existingChildren)
      }

      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (element.type === REACT_FRAGMENT_TYPE) {
            return updateFragment(returnFiber, before, element, keyToUse, existingChildren)
          }

          if (before && before?.type === element.type) {
            existingChildren.delete(keyToUse)
            return useFiber(before, element.props)
          }
          return creatFiberFromElement(element)
      }
      if (Array.isArray(element) && __DEV__) {
        console.log('还未实现数组类型的child')
      }
    }

    return null
  }

  // 插入单一的节点
  function placeSingleChild(fiber: FiberNode) {
    if (shoukdTrackEffects && fiber.alternate === null) {
      // 首屏渲染
      fiber.flags |= Placement
    }
    return fiber
  }

  return function recocileChildFibers(returnFiber: FiberNode, currentFiber: FiberNode | null, newChild?: any) {
    const isUnkeyedToplevelFragment =
      typeof newChild === 'object' &&
      newChild !== null &&
      newChild.type === REACT_FRAGMENT_TYPE &&
      newChild.key === null

    if (isUnkeyedToplevelFragment) {
      newChild = newChild?.props.children
    }

    // 判断fiber的类型
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild))

        default:
          if (__DEV__) {
            console.warn('未实现的reconcile类型', newChild)
          }
          break
      }
      // 多节点的情况 ul > li * 3

      if (Array.isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFiber, newChild)
      }
    }

    // HostText
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(reconcileTextNode(returnFiber, currentFiber, newChild))
    }

    if (currentFiber) {
      deleteRemainingChildren(returnFiber, currentFiber)
    }

    if (__DEV__) {
      console.warn('未实现的reconcile类型', newChild, shoukdTrackEffects)
    }
    return null
  }
}

export const recocileChildFibers = ChildReconciler(true)

export const mountChildFibers = ChildReconciler(false)

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
  const clone = creatWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

function updateFragment(
  returnFiber: FiberNode,
  current: FiberNode | undefined,
  elements: any[],
  key: Key,
  existingChildren: ExistingChildren
) {
  let fiber
  if (!current || current.tag !== Fragment) {
    fiber = creatFiberFromFragment(elements, key)
  } else {
    existingChildren.delete(key)
    fiber = useFiber(current, elements)
  }
  fiber.return = returnFiber
  return fiber
}
