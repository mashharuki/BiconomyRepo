import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account";
import { Bundler, IBundler } from '@biconomy/bundler';
import { ChainId } from "@biconomy/core-types";
import { DEFAULT_ECDSA_OWNERSHIP_MODULE, ECDSAOwnershipValidationModule } from "@biconomy/modules";
import {
  BiconomyPaymaster,
  IPaymaster,
} from '@biconomy/paymaster';
import { Signer } from "ethers";

import {
  IHybridPaymaster,
  PaymasterMode,
  SponsorUserOperationDto
} from '@biconomy/paymaster';
import { ethers } from "ethers";
import 'react-toastify/dist/ReactToastify.css';
import abi from "../utils/abi.json";

const nftAddress = "0x0a7755bDfb86109D9D403005741b415765EAf1Bc"


const bundler: IBundler = new Bundler({
  bundlerUrl: `https://bundler.biconomy.io/api/v2/${ChainId.BASE_GOERLI_TESTNET.toString()}/${process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_KEY!}`,    
  chainId: ChainId.BASE_GOERLI_TESTNET,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
})

const paymaster: IPaymaster = new BiconomyPaymaster({
  paymasterUrl: `https://paymaster.biconomy.io/api/v1/${ChainId.BASE_GOERLI_TESTNET.toString()}/${process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_KEY!}` 
})


/**
 * createSmartWallet method
 * @param signer 
 */
export const createSmartWallet = async(signer: Signer) => {
  // eslint-disable-next-line @next/next/no-assign-module-variable
  const module = await ECDSAOwnershipValidationModule.create({
    signer: signer, // ここをPKPwalletに変える
    moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
  });

  let biconomySmartAccount = await BiconomySmartAccountV2.create({
    chainId: ChainId.BASE_GOERLI_TESTNET,
    bundler: bundler, 
    paymaster: paymaster,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    defaultValidationModule: module,
    activeValidationModule: module
  })

  const smartContractAddress = await biconomySmartAccount.getAccountAddress();

  return {
    smartContractAddress,
    biconomySmartAccount
  };
}

/**
 * mint NFT method
 * @param smartAccount 
 * @param address 
 * @param provider 
 * @param to 
 * @returns 
 */
export const  mintNft = async (
  smartAccount: BiconomySmartAccountV2, 
  address: string, 
  provider: any, 
  to: string
) => {
  const contract = new ethers.Contract(
    nftAddress,
    abi,
    provider,
  )

  try {
    const minTx = await contract.populateTransaction.safeMint(address);
    console.log(minTx.data);

    const tx1 = {
      to: to,
      data: minTx.data,
    };

    let userOp = await smartAccount.buildUserOp([tx1]);
    console.log({ userOp })
    
    const biconomyPaymaster = smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;
    
    let paymasterServiceData: SponsorUserOperationDto = {
      mode: PaymasterMode.SPONSORED,
      smartAccountInfo: {
        name: 'BICONOMY',
        version: '2.0.0'
      },
      calculateGasLimits: true
    };

    const paymasterAndDataResponse =
      await biconomyPaymaster.getPaymasterAndData(
        userOp,
        paymasterServiceData
      );

    userOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;

    if (
      paymasterAndDataResponse.callGasLimit &&
      paymasterAndDataResponse.verificationGasLimit &&
      paymasterAndDataResponse.preVerificationGas
    ) {
      userOp.callGasLimit = paymasterAndDataResponse.callGasLimit;
      userOp.verificationGasLimit =
      paymasterAndDataResponse.verificationGasLimit;
      userOp.preVerificationGas =
      paymasterAndDataResponse.preVerificationGas;
    }
      
    const userOpResponse = await smartAccount.sendUserOp(userOp);
    console.log("userOpHash", userOpResponse);
    
    const { receipt } = await userOpResponse.wait(1);
    console.log("txHash", receipt.transactionHash);

    return receipt.transactionHash;
  } catch (err: any) {
    console.error("err", err);
    console.log("err:", err)
    return;
  }
} 