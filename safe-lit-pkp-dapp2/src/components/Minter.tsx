
import { Biconomy } from '@/hooks/biconomy';
import styles from '@/styles/Home.module.css';
import { BiconomySmartAccountV2 } from "@biconomy/account";
import { ethers } from "ethers";
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import pdfjsWorkerSrc from '../../pdf-worker';
import { SignContractInfos } from './../utils/types';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

const nftAddress = "0x0a7755bDfb86109D9D403005741b415765EAf1Bc";

interface Props {
  biconomyService: Biconomy,
  smartAccount: BiconomySmartAccountV2,
  address: string,
  provider: ethers.providers.Provider,
  data: SignContractInfos
}

/**
 * Minter Component
 * @param param0 
 * @returns 
 */
const Minter: React.FC<Props> = ({ biconomyService, smartAccount, address, provider, data }) => {
  const [minted, setMinted] = useState<boolean>(false)
  const [numPages, setNumPages] = useState(1);

  console.log("safeAddress:", data.signContractCreateds[0].safeAddress)
  console.log("url:", data.signContractCreateds[0].uri)

  /**
   * handleMint
   */
  const handleMint = async () => {
    toast.info('Minting your NFT...', {
      position: "top-right",
      autoClose: 15000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
     });

    // call mintNFT method
    const transactionHash = await biconomyService.mintNft(
      smartAccount, 
      address, 
      provider, 
      nftAddress
    );

    setMinted(true)

    toast.success(`Success! Here is your transaction:${transactionHash} `, {
      position: "top-right",
      autoClose: 18000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
    });
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };


  return(
    <>
      {address && <h2>SignName:{data.signContractCreateds[0].name}</h2>}
      {address && <h3>SafeAddress:{data.signContractCreateds[0].safeAddress}</h3>}
      {address && (
        <>
          { (data.changeApproveStatuses[0] == undefined) ? 
            <p>approveStatus: Not Appvoed</p> 
          : 
            <h3>approveStatus:{data.changeApproveStatuses[0].approveStatus}</h3> 
          }
        </>
      )}
      {address && <button onClick={handleMint} className={styles.connect}>Sign</button>}
      {address && (
        <div>
          <Document 
            file={'https://bafybeibawd4uszujdype4emondxzksmbsxputel6tip5ocgr3plv746z3e.ipfs.dweb.link/SIMPLE%20CONTRACT%20AGREEMENT.pdf'} 
            onLoadSuccess={onDocumentLoadSuccess}
          >
            <div style={{ border: 'solid 1px gray'}}>
              <Page height={2500} pageNumber={numPages} />
            </div>
          </Document>
        </div>
      )}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  )
}

export default Minter;