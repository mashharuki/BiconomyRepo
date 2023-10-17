import { gql } from 'urql';

// subgraph query
const query = gql`
  query MyQuery {
    signContractCreateds(
      orderBy: signId, 
      orderDirection: desc, 
      where: {signId: "0"}
    ) {
      appId
      name
      receipeId
      required
      safeAddress
      signId
      uri
      owners
    }
    changeApproveStatuses(
      orderBy: signId, 
      orderDirection: desc,
      where: {signId: "0"}  
    ) {
      appId
      receipeId
      signId
      approveStatus
    }
    signatureAddeds(
      orderBy: signId, 
      orderDirection: desc,
      where: {signId: "0"}  
    ) {
      appId
      receipeId
      signId
      signature
    }
  } 
`;

export default query;