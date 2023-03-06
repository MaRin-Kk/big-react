import { Props, Key, Ref } from 'shared/ReactType'
import { WorkTag } from './workTags'

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
  alternate: FiberNode | null

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

    this.alternate = null
  }
}
