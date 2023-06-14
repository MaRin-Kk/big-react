let syncQuque: ((...args: any) => void)[] | null = null
let isFlushingQueue = false

export function scheduleSyncCallback(callback: (...args: any) => void) {
  if (syncQuque === null) {
    syncQuque = [callback]
  } else {
    syncQuque.push(callback)
  }
}

export function flushSyncCallbacks() {
  if (!isFlushingQueue && syncQuque) {
    isFlushingQueue = true
    try {
      syncQuque.forEach((v) => v())
    } catch (e) {
      if (__DEV__) {
        console.error('flushSyncCallback报错', e)
      }
    } finally {
      isFlushingQueue = false
      syncQuque = null
    }
  }
}
