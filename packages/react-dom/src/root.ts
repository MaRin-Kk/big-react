import { Container } from './hostConfig'
import { creatContainer, updateContainer } from 'react-reconciler/src/fiberReconciler'
import { ReactElementType } from 'shared/ReactType'

export function creatRoot(container: Container) {
  const root = creatContainer(container)

  return {
    render(element: ReactElementType) {
      updateContainer(element, root)
    }
  }
}
