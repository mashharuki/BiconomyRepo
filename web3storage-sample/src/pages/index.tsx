import axios from "axios";
import { Inter } from 'next/font/google';
import { useReducer } from 'react';
const inter = Inter({ subsets: ['latin'] })

/**
 * Home Component
 */
export default function Home() {
  const [messages, showMessage] = useReducer((msgs:any, m:any) => msgs.concat(m), [])

  
  async function callAPI(e: any) {
    e.preventDefault()

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      await axios.post(`/api/upload`,
        formData
      );
    } catch (error) {
      console.error('network error:', error);
    }
  }

  function showLink (url: any) {
    showMessage(<span>&gt; 🔗 <a href={url}>{url}</a></span>)
  }
 
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <h1>⁂
        <span>web3.storage</span>
      </h1>
      <input type='file' id='filepicker' name='アップロード' onChange={e => callAPI(e)} multiple required />
      <div id='output'>
        &gt; ⁂ waiting for form submission...
        {messages.map((m: any, i: any) => <div key={m + i}>{m}</div>)}
      </div>
    </main>
  )
}
