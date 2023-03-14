import { ReactElementType } from 'shared/ReactType'
import { FiberNode, FiberRootNode } from './fiber'
import { Container } from './hostconfig'
import { creatUpdate, creatUpdateQueue, enqueueUpdate, UpdateQueue } from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'
import { HostRoot } from './workTags'

export function creatContainer(container: Container) {
  const hostRooterFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRooterFiber)
  hostRooterFiber.updateQueue = creatUpdateQueue()
  return root
}
export function updateContainer(element: ReactElementType | null, root: FiberRootNode) {
  const hostRooterFiber = root.current
  const update = creatUpdate<ReactElementType | null>(element)
  enqueueUpdate(hostRooterFiber.updateQueue as UpdateQueue<ReactElementType | null>, update)
  scheduleUpdateOnFiber(hostRooterFiber)
  return element
}
