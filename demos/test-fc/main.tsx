import React from 'react'
import ReactDOM from 'react-dom/client'


function App() {
  return <div>
    <Child />
  </div>
}

function Child() {
  return <span>big-react</span>
}
const jsx = (
  <div>
    hello <span>dsb</span>
  </div>
)


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
