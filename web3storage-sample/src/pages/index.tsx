import { Inter } from 'next/font/google';
import { useReducer, useState } from 'react';

const inter = Inter({ subsets: ['latin'] })

/**
 * Home Component
 */
export default function Home() {
  const [messages, showMessage] = useReducer((msgs:any, m:any) => msgs.concat(m), [])
  const [token, setToken] = useState('')
  const [files, setFiles] = useState([])


  async function callAPI() {
    const dataToSend = { key: 'value' }; 
  
    try {
      const response = await fetch('/api/hello', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
  
      if (response.status === 200) {
        const data = await response.json();
        console.log(data.name); 
      } else {
        console.error('API error:', response.status);
      }
    } catch (error) {
      console.error('network error:', error);
    }
  }
 
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <h1>⁂
        <span>web3.storage</span>
      </h1>
      <button
        onClick={callAPI}
      >
        call api
      </button>
    </main>
  )
}
