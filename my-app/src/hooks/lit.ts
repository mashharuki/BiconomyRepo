import { RPC_URL } from "@/utils/constants";
import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import { AuthMethodType, ProviderType } from "@lit-protocol/constants";
import {
  LitAuthClient,
  WebAuthnProvider,
} from "@lit-protocol/lit-auth-client/src/index.js";
import { LitNodeClientNodeJs } from "@lit-protocol/lit-node-client-nodejs";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import {
  AuthCallbackParams,
  AuthMethod,
  GetSessionSigsProps,
  IRelayPKP,
  SessionSigs,
} from '@lit-protocol/types';

const litNodeClient = new LitNodeClientNodeJs({
  litNetwork: "cayenne",
  debug: true,
});

// Lit用のインスタンスを設定
const authClient = new LitAuthClient({
  litRelayConfig: {
    relayApiKey: process.env.NEXT_PUBLIC_LIT_RELAY_API_KEY,
  },
  litNodeClient,
});

const resourceAbilities = [
  {
    resource: new LitActionResource('*'),
    ability: LitAbility.PKPSigning,
  },
];

/**
 * 接続
 */
async function connect() {
  await litNodeClient.connect();
}

/**
 * Generate session sigs for given params
 */
export async function getSessionSigs({
  pkpPublicKey,
  authMethod,
  sessionSigsParams,
}: {
  pkpPublicKey: string;
  authMethod: AuthMethod;
  sessionSigsParams: GetSessionSigsProps;
}): Promise<SessionSigs> {
  await connect();
  const provider = getProviderByAuthMethod(authMethod);

  console.log("provider", provider);

  if (provider) {
    // get sessionSigs info
    const sessionSigs = await provider.getSessionSigs({
      pkpPublicKey,
      authMethod,
      sessionSigsParams,
    });
    return sessionSigs;
  } else {
    throw new Error(
      `Provider not found for auth method type ${authMethod.authMethodType}`
    );
  }
}

/**
 * Register new WebAuthn credential
 * ✨ very important
 */
export async function registerWebAuthn(): Promise<IRelayPKP> {
  await connect();
  const provider = authClient.initProvider<WebAuthnProvider>(
    ProviderType.WebAuthn
  );
  // Register new WebAuthn credential
  const options = await provider.register();

  // Verify registration and mint PKP through relay server
  const txHash = await provider.verifyAndMintPKPThroughRelayer(options);
  const response = await provider.relay.pollRequestUntilTerminalState(txHash);
  if (response.status !== 'Succeeded') {
    throw new Error('Minting failed');
  }
  // RealyPKP型のオブジェクトを生成
  const newPKP: IRelayPKP = {
    tokenId: response.pkpTokenId!,
    publicKey: response.pkpPublicKey!,
    ethAddress: response.pkpEthAddress!,
  };
  return newPKP;
}

/**
 * Get auth method object by authenticating with a WebAuthn credential
 */
export async function authenticateWithWebAuthn(): Promise<AuthMethod | undefined> {
  await connect();
  let provider = authClient.getProvider(ProviderType.WebAuthn);

  if (!provider) {
    provider = authClient.initProvider<WebAuthnProvider>(
      ProviderType.WebAuthn
    );
  }
  const authMethod = await provider!.authenticate();
  return authMethod;
}

/**
 * Fetch PKPs associated with given auth method
 */
export async function getPKPs(authMethod: AuthMethod): Promise<IRelayPKP[]> {
  await connect();
  const provider = getProviderByAuthMethod(authMethod);
  const pkpInfo = await provider!.fetchPKPsThroughRelayer(authMethod);
  console.log("pkpInfo:", pkpInfo);

  return pkpInfo;
}

/**
 * Mint a new PKP for current auth method
 */
export async function mintPKP(): Promise<any> {
  await connect();
  const provider = authClient.initProvider<WebAuthnProvider>(
    ProviderType.WebAuthn
  );

  const authMethod = await provider.authenticate();
  // get public key
  const publicKey = await provider.computePublicKeyFromAuthMethod(authMethod);
  console.log("local public key computed: ", publicKey);

  let claimResp = await provider.claimKeyId({
    authMethod,
  });
  console.log("claim response public key: ", claimResp.pubkey);  
  console.log("claim : ", claimResp);  
  
  return claimResp.pubkey;
}

/**
 * For provisioning keys and setting up authentication methods see documentation below
 * https://developer.litprotocol.com/v2/pkp/minting
 */
const authNeededCallback = async (params: AuthCallbackParams) => {
  const response = await litNodeClient.signSessionKey({
    statement: params.statement,
    authMethods: [],
    pkpPublicKey: '04299b3fb4de0c2ed3df36ea31afd8cc59857dd4218aefd8d353ad736dff5595e135abd163e481efbc78f4c8c9b555861db6a6918d967e17193c5bdba46691033a',
    expiration: params.expiration,
    resources: params.resources,
    chainId: 1,
  });
  return response.authSig;
};


/**
 * get PKP Wallet method
 */
export async function getPkpWallet(
  pkpPublicKey: any, 
  authMethod: AuthMethod,
  // sessionSig: SessionSigs
): Promise<PKPEthersWallet> {

  // get sssionSig
  let provider = authClient.getProvider(ProviderType.WebAuthn);

  console.log("provider:", provider)
  console.log("authMethod:", authMethod)

  const sessionSigs = await provider!.getSessionSigs({
    authMethod: authMethod,
    pkpPublicKey: pkpPublicKey,
    sessionSigsParams: {
      chain: 'ethereum',
      resourceAbilityRequests: resourceAbilities,
    },
  });

  console.log("sessionSigs:", sessionSigs);

  // create PKP instance
  const pkpWallet = new PKPEthersWallet({
    pkpPubKey: pkpPublicKey,
    rpc: RPC_URL,
    controllerSessionSigs: sessionSigs
  });
  await pkpWallet.init();

  console.log("pkpWallet:", pkpWallet);
  console.log("pkpWallet's address:", await pkpWallet.getAddress());
  console.log("pkpWallet's add:", await pkpWallet.getAddress());

  return pkpWallet;
}

/**
 * Get provider for given auth method
 */
function getProviderByAuthMethod(authMethod: AuthMethod) {
  switch (authMethod.authMethodType) {
    case AuthMethodType.WebAuthn:
      return authClient.getProvider(ProviderType.WebAuthn);
    default:
      return;
  }
}