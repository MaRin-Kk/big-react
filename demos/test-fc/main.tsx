import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'


function App() {
  const [num, setNum] = useState(0)

  useEffect(() => {
    console.log('app mount');
  }, [])

  useEffect(() => {
    console.log('number change creat', num);
    return () => console.log('number change destory', num)
  }, [num])
  return <ul onClick={() => setNum(num => num + 1)}>
    {num === 0 ? <Child /> : 'noop'}
  </ul>
}

function Child() {

  useEffect(() => {
    console.log('child mount');
    return () => console.log('child unmount')
  }, [])

  return '123'
}
const jsx = (
  <div>
    hello <span>dsb</span>
  </div>
)


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
