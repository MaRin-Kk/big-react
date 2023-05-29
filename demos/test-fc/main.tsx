import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'


function App() {
  const [num, setNum] = useState(100)
  window.setNum = setNum
  return num === 3 ? <Child /> :
    <div>
      {num}
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
