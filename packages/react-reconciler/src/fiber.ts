import { Props, Key, Ref, ReactElementType } from 'shared/ReactType'
import { Flags, NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'
import { Fragment, FuntionComponent, HostComponent, WorkTag } from './workTags'
import { Lane, Lanes, NoLane, NoLanes } from './fiberLans'
import { Effect } from './fiberHooks'
import { CallbackNode } from 'scheduler'

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
  deletions: FiberNode[] | null
  
  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例
    this.tag = tag
    this.key = key || null
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
    this.deletions = null

  }
}

export interface PendingPasssiveEffects {
  update: Effect[]
  unmount: Effect[]
}

export class FiberRootNode {
  container: Container
  current: FiberNode
  finishedWork: FiberNode | null
  pendingLanes: Lanes
  finishedLanes: Lane
  pendingPassiveEffects: PendingPasssiveEffects
  callbackNode: CallbackNode | null;
  callbackPriority: Lane;
  
  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
    this.pendingLanes = NoLanes
    this.finishedLanes = NoLane
    
    		// 调度的回调函数
		this.callbackNode = null;
		// 调度的回调函数优先级
		this.callbackPriority = NoLane;

    this.pendingPassiveEffects = {
      unmount: [],
      update: []
    }
  }

  
}

export const creatWorkInProgress = (current: FiberNode, pendingProps: Props) => {
  let wip = current.alternate

  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key)
    wip.stateNode = current.stateNode

    wip.alternate = current
    current.alternate = wip
  } else {
    // update
    wip.pendingProps = pendingProps
    wip.flags = NoFlags
    wip.subtreeFlags = NoFlags
    wip.deletions = null
  }

  wip.type = current.type
  wip.updateQueue = current.updateQueue
  wip.child = current.child
  wip.memoizedProps = current.memoizedProps
  wip.memoizedState = current.memoizedState
  return wip
}
export function creatFiberFromFragment(elelemt: any[], key: Key): FiberNode {
  const fiber = new FiberNode(Fragment, elelemt, key)
  return fiber
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
