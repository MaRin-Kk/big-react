import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbiols'
import { ReactElementType } from 'shared/ReactType'
import { creatFiberFromElement, FiberNode } from './fiber'
import { Placement } from './fiberFlags'
import { HostText } from './workTags'

function ChildReconciler(shoukdTrackEffects: boolean) {
  function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElementType) {
    // 根据element 创建fiber 返回
    const fiber = creatFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  function reconcileTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {
    // 根据element 创建fiber 返回
    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber
    return fiber
  }

  function placeSingleChild(fiber: FiberNode) {
    if (shoukdTrackEffects && fiber.alternate) {
      // 首屏渲染
      fiber.flags |= Placement
    }
    return fiber
  }

  return function recocileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElementType
  ) {
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
    }

    // 多节点的情况 ul > li * 3

    // HostText
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(reconcileTextNode(returnFiber, currentFiber, newChild))
    }
    return null
  }
}

export const recocileChildFibers = ChildReconciler(true)

export const mountChildFibers = ChildReconciler(false)
