import { scheduleMicroTask } from 'hostConfig'
import { unstable_scheduleCallback as scheduleCallback, unstable_NormalPriority as NomalPriority, unstable_shouldYield } from 'scheduler'
import { beginWork } from './beginWork'
import {
  commitHookEffectListCreate,
  commitHookEffectListDestory,
  commitHookEffectListUnmount,
  commitMutationEffects
} from './commitWork'
import { completeWork } from './completeWork'
import { creatWorkInProgress, FiberNode, FiberRootNode, PendingPasssiveEffects } from './fiber'
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags'
import { getHeightPriortyLane, getHighestPriorityLane, getNextLanes, Lane, Lanes, lanesToSchedulerPriority, markRootFinished, mergeLanes, NoLane, NoLanes, SyncLane } from './fiberLans'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { HostRoot } from './workTags'
import { HookHasEffect, Passive } from './hooksEffectTags'

type ExecutionContext = number;
const RenderContext = /*                */ 0b0010;
const CommitContext = /*                */ 0b0100;
export const NoContext = /*             */ 0b0000;
let workInProgressRootRenderLane: Lanes = NoLanes;
let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
let rootDoesHasPassEffects: boolean = false
let executionContext: ExecutionContext = NoContext;
// 并发更新未完成
const RootIncomplete = 1;
// 更新完成
const RootCompleted = 2;


function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  root.finishedLanes = NoLane
  root.finishedWork = null
  
  workInProgress = creatWorkInProgress(root.current, {})
  wipRootRenderLane = lane
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  // TODO 调度功能
  const root = markUpdateFormFiberToRoot(fiber)
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

// schedule调度阶段入口
function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLanes = getNextLanes(root);
  const curPriority = getHighestPriorityLane(updateLanes);
  const updateLane = getHeightPriortyLane(root.pendingLanes)
  if (updateLane === NoLane) {
    return
  }
  	// 如果使用Scheduler调度，则会存在新的callbackNode，用React微任务调度不会存在
	let newCallbackNode = null;
  if (updateLane === SyncLane) {
    // 同步优先级 微任务调度
    if (__DEV__) {
      console.log('在微任务中调度', updateLane)
    }
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // 其它优先级 宏任务调度
    // Scheduler调度
		const schedulerPriority = lanesToSchedulerPriority(curPriority);
		newCallbackNode = scheduleCallback(
			schedulerPriority,
			performConcurrentWorkOnRoot.bind(null, root)
		);
  }
  root.callbackNode = newCallbackNode;
	root.callbackPriority = curPriority;
}
function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

function markUpdateFormFiberToRoot(fiber: FiberNode) {
  //节点
  let node = fiber
  //父节点
  let parent = node.return
  while (parent) {
    node = parent
    parent = node.return
  }
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
		throw '当前不应处于React工作流程内';
	}

	// 开始执行具体工作前，保证上一次的useEffct都执行了
	// 同时要注意useEffect执行时触发的更新优先级是否大于当前更新的优先级
	const didFlushPassiveEffects = flushPassiveEffects(
		root.pendingPassiveEffects
	);
	const curCallbackNode = root.callbackNode;
	if (didFlushPassiveEffects) {
		if (root.callbackNode !== curCallbackNode) {
			// 调度了更高优更新，这个更新已经被取消了
			return null;
		}
	}

	const lanes = getNextLanes(root);
	if (lanes === NoLanes) {
		return null;
	}

	// 本次更新是否是并发更新？
	// TODO 饥饿问题也会影响shouldTimeSlice
	const shouldTimeSlice = !didTimeout;
	const exitStatus = renderRoot(root, lanes, shouldTimeSlice);

	ensureRootIsScheduled(root);
	if (exitStatus === RootIncomplete) {
		if (root.callbackNode !== curCallbackNode) {
			// 调度了更高优更新，这个更新已经被取消了
			return null;
		}
		return performConcurrentWorkOnRoot.bind(null, root);
	}
	if (exitStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLanes = lanes;

		// commit阶段操作
		commitRoot(root);
	} else {
		throw '还未实现的并发更新结束状态';
	}
}

function renderRoot(
	root: FiberRootNode,
	lanes: Lanes,
	shouldTimeSlice: boolean
) {
	if (__DEV__) {
		console.log(`开始${shouldTimeSlice ? '并发' : '同步'}render阶段`, root);
	}
	const prevExecutionContext = executionContext;
	executionContext |= RenderContext;

	// 初始化操作
	prepareFreshStack(root, lanes);

	// render阶段具体操作
	do {
		try {
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (e) {
			console.error('workLoop发生错误', e);
			workInProgress = null;
		}
	} while (true);

	executionContext = prevExecutionContext;

	if (shouldTimeSlice && workInProgress !== null) {
		return RootIncomplete;
	}
	if (!shouldTimeSlice && workInProgress !== null) {
		console.error('render阶段结束时wip不为null');
	}

	workInProgressRootRenderLane = NoLane;
	return RootCompleted;
}
function performSyncWorkOnRoot(root: FiberRootNode, lanes: Lanes) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);

	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}

	const exitStatus = renderRoot(root, lanes, false);
	if (exitStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLanes = lanes;

		// commit阶段操作
		commitRoot(root);
	} else {
		throw '还未实现的同步更新结束状态';
	}
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork
  if (finishedWork === null) {
    return
  }
  if (__DEV__) {
    console.warn('commit阶段开始', finishedWork)
  }

  const lane = root.finishedLanes

  if (lane === NoLane && __DEV__) {
    console.error('commit阶段finishLane不应该是NoLane')
  }
  // 重置
  root.finishedWork = null
  root.finishedLanes = NoLane

  markRootFinished(root, lane)

  if ((finishedWork.flags & PassiveMask) !== NoFlags || (finishedWork.subtreeFlags & PassiveMask) !== NoFlags) {
    if (!rootDoesHasPassEffects) {
      rootDoesHasPassEffects = true
      // 调度副作用
      scheduleCallback(NomalPriority, () => {
        // 执行副作用
        flushPassiveEffects(root.pendingPassiveEffects)
        return
      })
    }
  }
  // 判断是否存在三个子阶段需要执行的操作
  // root flags root subtreeFlags
  const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags
  if (subtreeHasEffect || rootHasEffect) {
    // beforeMutation
    // mutataion  Placement
    commitMutationEffects(finishedWork, root)
    root.current = finishedWork
    // layout
  } else {
    root.current = finishedWork
  }

  rootDoesHasPassEffects = false
  ensureRootIsScheduled(root)
}

function flushPassiveEffects(pendingPassiveEffects: PendingPasssiveEffects) {

  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
		console.error('不能在React工作流程内执行useEffect回调');
  }
  
  let didFlushPassiveEffects = false;

  pendingPassiveEffects.unmount.forEach((effect) => {
    didFlushPassiveEffects = true;
    commitHookEffectListUnmount(Passive, effect)
  })
  pendingPassiveEffects.unmount = []

  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffects = true;
    commitHookEffectListDestory(Passive | HookHasEffect, effect)
  })

  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffects = true;
    commitHookEffectListCreate(Passive | HookHasEffect, effect)
  })
  pendingPassiveEffects.update = []
  flushSyncCallbacks()
  return  didFlushPassiveEffects
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber, wipRootRenderLane)
  fiber.memoizedProps = fiber.pendingProps
  if (next === null) {
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber

  do {
    completeWork(node)
    if (node.sibling !== null) {
      workInProgress = node.sibling
      return
    }
    node = node.return
    workInProgress = node
  } while (node !== null)
}
function workLoopSync() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function workLoopConcurrent() {
	while (workInProgress !== null && !unstable_shouldYield()) {
		performUnitOfWork(workInProgress);
	}
}
