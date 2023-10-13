
import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account";
import { Bundler, IBundler } from '@biconomy/bundler';
import { ChainId } from "@biconomy/core-types";
import { DEFAULT_ECDSA_OWNERSHIP_MODULE, ECDSAOwnershipValidationModule } from "@biconomy/modules";
import {
  BiconomyPaymaster,
  IHybridPaymaster,
  IPaymaster,
  PaymasterFeeQuote,
  PaymasterMode,
  SponsorUserOperationDto
} from '@biconomy/paymaster';
import { config } from "dotenv";
import { Wallet, ethers, providers } from 'ethers';

config()

// chain ID
const chianId = ChainId.POLYGON_MUMBAI;

const bundler: IBundler = new Bundler({
  bundlerUrl: `https://bundler.biconomy.io/api/v2/${chianId.toString()}/${process.env.BICONOMY_BUNDLER_KEY!}`,    
  chainId: ChainId.POLYGON_MUMBAI,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
})

const paymaster: IPaymaster = new BiconomyPaymaster({
  paymasterUrl: `https://paymaster.biconomy.io/api/v1/${chianId.toString()}/${process.env.BICONOMY_PAYMASTER_KEY!}` 
})

const provider = new providers.JsonRpcProvider("https://rpc.ankr.com/polygon_mumbai")
const wallet = new Wallet(process.env.PRIVATE_KEY || "", provider);


let smartAccount: BiconomySmartAccountV2
let address: string

/**
 * createAccount method
 * @returns 
 */
async function createAccount() {
  const module = await ECDSAOwnershipValidationModule.create({
    signer: wallet,
    moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
  })

  console.log("creating address")
  let biconomySmartAccount = await BiconomySmartAccountV2.create({
    chainId: ChainId.POLYGON_MUMBAI,
    bundler: bundler,
    paymaster: paymaster, 
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    defaultValidationModule: module,
    activeValidationModule: module
})
  address = await biconomySmartAccount.getAccountAddress()
  smartAccount = biconomySmartAccount;
  return biconomySmartAccount;
}

/**
 * mintNFT method
 */
async function mintNFT() {
  await createAccount();

  const nftInterface = new ethers.utils.Interface([
    "function safeMint(address _to)",
  ]);
  
  console.log("address:", address)
  const data = nftInterface.encodeFunctionData("safeMint", [address]);

  const nftAddress = "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e";

  const transaction = {
    to: nftAddress,
    data: data,
    value: ethers.utils.parseEther('0')
  };

  console.log("creating nft mint userop")
  let partialUserOp = await smartAccount.buildUserOp([transaction]);

  let finalUserOp = partialUserOp;
  const biconomyPaymaster = smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;

  const feeQuotesResponse = await biconomyPaymaster.getPaymasterFeeQuotesOrData(
    partialUserOp,
    {
      mode: PaymasterMode.ERC20,
      tokenList: ["0xda5289fcaaf71d52a80a254da614a192b693e977"],
    }
  );

  const feeQuotes = feeQuotesResponse.feeQuotes as PaymasterFeeQuote[];
  const spender = feeQuotesResponse.tokenPaymasterAddress || "";
  const usdcFeeQuotes = feeQuotes[0];


  finalUserOp = await smartAccount.buildTokenPaymasterUserOp(partialUserOp, {
    feeQuote: usdcFeeQuotes,
    spender: spender,
    maxApproval: false,
  });

  console.log("usdcFeeQuotes.tokenAddress:", usdcFeeQuotes.tokenAddress)

  let paymasterServiceData = {
    mode: PaymasterMode.ERC20,
    feeTokenAddress: usdcFeeQuotes.tokenAddress,
    calculateGasLimits: true, 
  };

  try {
    console.log("getting paymaster and data")
    const paymasterAndDataResponse =
      await biconomyPaymaster.getPaymasterAndData(
        finalUserOp,
        paymasterServiceData
      );
    finalUserOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;
    console.log("paymasterAndDataResponse: ", paymasterAndDataResponse);
  
    if (
      paymasterAndDataResponse.callGasLimit &&
      paymasterAndDataResponse.verificationGasLimit &&
      paymasterAndDataResponse.preVerificationGas
    ) {
      finalUserOp.callGasLimit = paymasterAndDataResponse.callGasLimit;
      finalUserOp.verificationGasLimit = paymasterAndDataResponse.verificationGasLimit;
      finalUserOp.preVerificationGas = paymasterAndDataResponse.preVerificationGas;
    }
  } catch (e) {
    console.log("error received ", e);
  }

  console.log("sending userop")
  try {
    // send op
    const userOpResponse = await smartAccount.sendUserOp(finalUserOp);
    const transactionDetails = await userOpResponse.wait();

    console.log(
      `transactionDetails: https://mumbai.polygonscan.com/tx/${transactionDetails.receipt.transactionHash}`
    )
    console.log(
      `view minted nfts for smart account: https://testnets.opensea.io/${address}`
    )
   } catch (e) {
    console.log("error received ", e);
  }
};

mintNFT();
