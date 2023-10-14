import Minter from '@/components/Minter';
import { createSmartWallet } from '@/hooks/biconomy';
import { initSession } from '@/hooks/useSession';
import styles from '@/styles/Home.module.css';
import { BiconomySmartAccountV2 } from "@biconomy/account";
import {
  SessionSigs
} from '@lit-protocol/types';
import { ethers } from 'ethers';
import Head from 'next/head';
import { useState } from "react";
import { authenticateWithWebAuthn, getPKPs, getPkpWallet, registerWebAuthn } from './../hooks/lit';
import { RPC_URL } from './../utils/constants';

// base Goerli RPC
const rpc_url = RPC_URL;
const provider = new ethers.providers.JsonRpcProvider(rpc_url);

/**
 * Home Component
 * @returns 
 */
export default function Home() { 
  const [address, setAddress] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false);
  const [smartAccount, setSmartAccount] = useState<BiconomySmartAccountV2 | null>(null);
  const [sessionSigs, setSessionSigs] = useState<SessionSigs>();

  /**
   * signUp
   */
  const signUp = async () => {
    setLoading(true)
    // register by Webauthn mint pkp (SignUpにあたる)
    const newPKP = await registerWebAuthn();
    //const newPKP = await mintPKP();
    console.log("newPKP:", newPKP);
    // authicate (SignInにあたる)
    const authMethod = await authenticateWithWebAuthn();
    // get PKPS 
    const pkp = await getPKPs(authMethod!);
    //const sessionSigs = await initSession(authMethod!, pkp[0]);
    // get new pkpWallet
    const newPkpWallet = await getPkpWallet(pkp[0].publicKey);

    // create smartWallet
    const {
      smartContractAddress: smartWalletAddress,
      biconomySmartAccount: smartAccount
    } = await createSmartWallet(newPkpWallet);
    
    setAddress(smartWalletAddress)
    setSmartAccount(smartAccount)
    setLoading(false)
  }

  /**
   * signIn method
   */
  const signIn = async () => {
    try {
      setLoading(true)
      // authicate (SignInにあたる)
      const authMethod = await authenticateWithWebAuthn();
      // get PKPS 
      const pkp = await getPKPs(authMethod!);
      const sessionSigs = await initSession(authMethod!, pkp[0]);
      // get new pkpWallet
      const newPkpWallet = await getPkpWallet(pkp[0].publicKey, authMethod!);

      // create smartWallet
      const {
        smartContractAddress: smartWalletAddress,
        biconomySmartAccount: smartAccount
      } = await createSmartWallet(newPkpWallet);
      
      setAddress(smartWalletAddress)
      setSmartAccount(smartAccount)
      setLoading(false)
    } catch (error) {
      console.error(error);
    }
  };


  return (
    <>
      <Head>
        <title>Based Account Abstraction</title>
        <meta name="description" content="Based Account Abstraction" />
      </Head>
      <main className={styles.main}>
        <h1>Based Account Abstraction</h1>
        <h2>Connect and Mint your AA powered NFT now</h2>
        {!loading && !address && <button onClick={signUp} className={styles.connect}>Sign Up</button>}
        {!loading && !address && <button onClick={signIn} className={styles.connect}>Sign In</button>}
        {loading && <p>Loading Smart Account...</p>}
        {address && <h2>Smart Account: {address}</h2>}
        {smartAccount && provider && <Minter smartAccount={smartAccount} address={address} provider={provider} />}
      </main>
    </>
  )
}
