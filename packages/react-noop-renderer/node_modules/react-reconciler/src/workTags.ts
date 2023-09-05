export type WorkTag =
  | typeof FuntionComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText
  | typeof Fragment

export const FuntionComponent = 0
export const HostRoot = 3
export const HostComponent = 5
export const HostText = 6
export const Fragment = 7
