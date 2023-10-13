import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account";
import { Bundler, IBundler } from '@biconomy/bundler';
import { ChainId } from "@biconomy/core-types";
import { DEFAULT_ECDSA_OWNERSHIP_MODULE, ECDSAOwnershipValidationModule } from "@biconomy/modules";
import { config } from "dotenv";
import { ethers } from 'ethers';

config()

const provider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/polygon_mumbai")
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);

// chain ID
const chianId = ChainId.POLYGON_MUMBAI;

const bundler: IBundler = new Bundler({
  bundlerUrl: `https://bundler.biconomy.io/api/v2/${chianId.toString()}/${process.env.BICONOMY_BUNDLER_KEY!}`,     
  chainId: chianId,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
})


async function createAccount() {
  const module = await ECDSAOwnershipValidationModule.create({
    signer: wallet,
    moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
  })
  
  let biconomyAccount = await BiconomySmartAccountV2.create({
    chainId: chianId,
    bundler: bundler, 
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    defaultValidationModule: module,
    activeValidationModule: module
  })

  // send prefund to smart wallet
  const res = await wallet.sendTransaction({
    to: await biconomyAccount.getAccountAddress(),
    data:'0x',
    value: ethers.utils.parseEther('0.0005')
  });

  res.wait();

  console.log("address", await biconomyAccount.getAccountAddress())
  return biconomyAccount
}

async function createTransaction() {
  const smartAccount = await createAccount();
  try {
    const transaction = {
      to: '0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072',
      data: '0x',
      value: ethers.utils.parseEther('0.0001'),
    }
  
    const userOp = await smartAccount.buildUserOp([transaction])
    userOp.paymasterAndData = "0x"
  
    const userOpResponse = await smartAccount.sendUserOp(userOp)
  
    const transactionDetail = await userOpResponse.wait()
  
    console.log("transaction detail below")
    console.log(`https://mumbai.polygonscan.com/tx/${transactionDetail.receipt.transactionHash}`)
  } catch (error) {
    console.log(error)
  }
}

createTransaction()