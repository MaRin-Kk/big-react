import { Container } from 'hostConfig'
import { unstable_runWithPriority } from 'scheduler'
import { Props } from 'shared/ReactType'

export const elementPropsKey = '__props'
const vaildEventTypeList = ['click']

export interface DOMElement extends Element {
  [elementPropsKey]: Props
}

type EventCallBack = (e: Event) => void
interface Paths {
  capture: EventCallBack[]
  bubble: EventCallBack[]
}

interface SysEvent extends Event {
  _stopPropagation: boolean
}
export function updateFiberProps(node: DOMElement, props: Props) {
  node[elementPropsKey] = props
}

export function initEvent(container: Container, eventType: string) {
  if (!vaildEventTypeList.includes(eventType)) {
    return console.warn('当前不支持', eventType, '事件')
  }

  if (__DEV__) {
    console.log('初始化事件', eventType)
  }
  container.addEventListener(eventType, (e) => {
    dispatchEvent(container, eventType, e)
  })
}

function creatSyntheticEvent(e: Event) {
  const sysEvent = e as SysEvent
  sysEvent._stopPropagation = false
  const originStopPagation = e.stopPropagation

  sysEvent.stopPropagation = () => {
    sysEvent._stopPropagation = true
    originStopPagation && originStopPagation()
  }
  return sysEvent
}
function dispatchEvent(container: Container, eventType: string, e: Event) {
  const targetElement = e.target

  if (targetElement === null) {
    return console.warn('事件不存在', e)
  }
  // 收集沿途的事件
  const { bubble, capture } = collectPaths(targetElement as DOMElement, container, eventType)
  // 构造合成事件
  const se = creatSyntheticEvent(e)

  // 遍历捕获
  triggerEventFlow(capture, se)
  if (!se._stopPropagation) {
    // 遍历冒泡
    triggerEventFlow(bubble, se)
  }
}
function triggerEventFlow(paths: EventCallBack[], se: SysEvent) {
  for (let i = 0; i < paths.length; i++) {
    const callback = paths[i]

    unstable_runWithPriority(eventTypeToEventPriority(se.type), () => {
    callback.call(null, se)
    })

    if (se._stopPropagation) {
      break
    }
  }
}
function getEventNameFromEventType(eventType: string): string[] | undefined {
  return {
    click: ['onClickCapture', 'onClick']
  }[eventType]
}
function collectPaths(target: DOMElement, container: Container, eventType: string) {
  const paths: Paths = {
    capture: [],
    bubble: []
  }
  while (target && target !== container) {
    // 收集
    const elementProps = target[elementPropsKey]
    if (elementProps) {
      const callBackNameList = getEventNameFromEventType(eventType)
      if (callBackNameList) {
        callBackNameList.forEach((v, i) => {
          if (elementProps[v]) {
            if (i === 0) {
              paths.capture.unshift(elementProps[v])
            } else {
              paths.bubble.push(elementProps[v])
            }
          }
        })
      }
    }
    target = target.parentNode as DOMElement
  }
  return paths
}

const eventTypeToEventPriority = (eventType: string) => {
	switch (eventType) {
		case 'click':
		case 'keydown':
		case 'keyup':
			return SyncLane;
		case 'scroll':
			return InputContinuousLane;
		// TODO 更多事件类型
		default:
			return DefaultLane;
	}
};
