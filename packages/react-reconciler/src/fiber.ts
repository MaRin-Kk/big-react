import { Props, Key, Ref, ReactElementType } from 'shared/ReactType'
import { Flags, NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'
import { FuntionComponent, HostComponent, WorkTag } from './workTags'

export class FiberNode {
  type: any
  tag: WorkTag
  pendingProps: Props
  key: Key
  stateNode: any
  ref: Ref

  return: FiberNode | null
  sibling: FiberNode | null
  child: FiberNode | null
  index: number
  memoizedProps: Props | null
  memoizedState: any

  alternate: FiberNode | null
  flags: Flags
  subtreeFlags: Flags

  updateQueue: unknown
  current: any
  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例
    this.tag = tag
    this.key = key
    // HostComponent  div DOM
    this.stateNode = null
    // FuntionComonent  ()=>{}
    this.type = null

    // 树状结构
    this.return = null
    this.sibling = null
    this.child = null
    this.index = 0

    this.ref = null

    // 工作单元
    this.pendingProps = pendingProps
    this.memoizedProps = null
    this.memoizedState = null
    this.updateQueue = null

    this.alternate = null

    // 副作用
    this.flags = NoFlags
    this.subtreeFlags = NoFlags
  }
}

export class FiberRootNode {
  container: Container
  current: FiberNode
  finshedWork: FiberNode | null
  constructor(container: Container, hostRooterFiber: FiberNode) {
    this.container = container
    this.current = hostRooterFiber
    hostRooterFiber.stateNode = this
    this.finshedWork = null
  }
}

export const creatWorkInProgress = (current: FiberNode, pendingProps: Props) => {
  let wip = current.alternate

  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key)
    wip.type = current.type
    wip.stateNode = current.stateNode

    wip.alternate = current
    current.alternate = wip
  } else {
    // update
    wip.pendingProps = pendingProps
    wip.flags = NoFlags
    wip.subtreeFlags = NoFlags

    wip.type = current.type
    wip.updateQueue = current.updateQueue
    wip.child = current.child
    wip.memoizedProps = current.memoizedProps
    wip.memoizedState = current.memoizedState
  }
  return wip
}

export function creatFiberFromElement(element: ReactElementType) {
  const { type, key, props } = element

  let fiberTag: WorkTag = FuntionComponent

  if (typeof type === 'string') {
    fiberTag = HostComponent
  } else if (typeof type !== 'function' && __DEV__) {
    console.warn('未定义的type类型', element)
  }

  const fiber = new FiberNode(fiberTag, props, key)

  fiber.type = type

  return fiber
}
