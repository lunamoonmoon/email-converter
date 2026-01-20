import './style.css'
import { setupCounter } from './counter.js'

document.querySelector('#app').innerHTML = `
  <div>
    <h3>Choose file to convert:</h3>
    <input type="file" id="fileInput" />
  </div>
`
