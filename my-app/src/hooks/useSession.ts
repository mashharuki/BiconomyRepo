import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import { AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { getSessionSigs } from './lit';

/**
 * Generate session sigs and store new session data
 */
export const initSession = async (
  authMethod: AuthMethod, 
  pkp: IRelayPKP
): Promise<any> => {
  try {
    // Prepare session sigs params
    const chain = 'ethereum';
    const resourceAbilities = [
      {
        resource: new LitActionResource('*'),
        ability: LitAbility.PKPSigning,
      },
    ];
    const expiration = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 7
    ).toISOString(); // 1 week

    // Generate session sigs
    const sessionSigs = await getSessionSigs({
      pkpPublicKey: pkp.publicKey,
      authMethod,
      sessionSigsParams: {
        chain,
        expiration,
        resourceAbilityRequests: resourceAbilities,
      },
    });

    console.log("sessionSig:", sessionSigs);
    return sessionSigs;
  } catch(err) {
    console.error("err:", err);
    return ;
  }
}

