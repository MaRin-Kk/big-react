import { ReactElementType } from 'shared/ReactType'
import { FiberNode, FiberRootNode } from './fiber'
import { Container } from 'hostConfig'
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue } from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'
import { HostRoot } from './workTags'
import { requestUpdateLane } from './fiberLans'

export function creatContainer(container: Container) {
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)
  hostRootFiber.updateQueue = createUpdateQueue()
  return root
}

export function updateContainer(element: ReactElementType | null, root: FiberRootNode) {
  const hostRootFiber = root.current
  const lane = requestUpdateLane()
  const update = createUpdate<ReactElementType | null>(element, lane)
  enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>, update)
  scheduleUpdateOnFiber(hostRootFiber, lane)
  return element
}
