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
console.log(React);
console.log(jsx);
console.log(ReactDOM);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
