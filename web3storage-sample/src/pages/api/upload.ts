// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { IncomingForm } from "formidable";
import type { NextApiRequest, NextApiResponse } from 'next';
import process from 'process';
import { Web3Storage } from 'web3.storage';

export const config = {
  api: {
    bodyParser: false,
  },
};

type Data = {
  cid: string
}

const form = new IncomingForm();


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'POST') {

    const token = process.env.WEB3_STORAGE_API_KEY;
    //console.log("token:", token)

    if (!token) {
      console.error('A token is needed. You can create one on https://web3.storage')
      return
    }

    form.parse(req, async function (err:any, fields:any, files:any) {
      if (err) {
        res.statusCode = 500;
        res.json({
          cid: err
        });
        res.end();
        return;
      }
      const file = files.file;
      
      console.log("upload files:", file)

      const storage = new Web3Storage({ token });
      const cid = await storage.put(file, { 
        wrapWithDirectory: false 
      })

      console.log('Content added with CID:', cid)
      console.log(`Gateway URL: https://dweb.link/ipfs/${cid}`)

        res.status(200).json({ 
          cid: cid
        })
      }
    )
  }
}
