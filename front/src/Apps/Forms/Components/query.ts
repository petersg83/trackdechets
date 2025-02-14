import gql from "graphql-tag";

export const TransporterFragment = gql`
  fragment TransporterFragment on Transporter {
    id
    company {
      name
      orgId
      siret
      address
      country
      contact
      phone
      mail
      vatNumber
      omiNumber
    }
    isExemptedOfReceipt
    receipt
    department
    validityLimit
    numberPlate
    customInfo
    mode
  }
`;

export const CREATE_FORM_TRANSPORTER = gql`
  mutation CreateFormTransporter($input: TransporterInput!) {
    createFormTransporter(input: $input) {
      ...TransporterFragment
    }
  }
  ${TransporterFragment}
`;

export const UPDATE_FORM_TRANSPORTER = gql`
  mutation UpdateFormTransporter($id: ID!, $input: TransporterInput!) {
    updateFormTransporter(id: $id, input: $input) {
      ...TransporterFragment
    }
  }
  ${TransporterFragment}
`;

export const DELETE_FORM_TRANSPORTER = gql`
  mutation DeleteFormTransporter($id: ID!) {
    deleteFormTransporter(id: $id)
  }
`;

export const BsdaTransporterFragment = gql`
  fragment BsdaTransporterFragment on BsdaTransporter {
    id
    company {
      name
      orgId
      siret
      address
      country
      contact
      phone
      mail
      vatNumber
      omiNumber
    }
    recepisse {
      isExempted
      number
      validityLimit
      department
    }
    transport {
      mode
      plates
      signature {
        date
      }
    }
  }
`;

export const CREATE_BSDA_TRANSPORTER = gql`
  mutation CreateBsdaTransporter($input: BsdaTransporterInput!) {
    createBsdaTransporter(input: $input) {
      ...BsdaTransporterFragment
    }
  }
  ${BsdaTransporterFragment}
`;

export const UPDATE_BSDA_TRANSPORTER = gql`
  mutation UpdateBsdaTransporter($id: ID!, $input: BsdaTransporterInput!) {
    updateBsdaTransporter(id: $id, input: $input) {
      ...BsdaTransporterFragment
    }
  }
  ${BsdaTransporterFragment}
`;

export const DELETE_BSDA_TRANSPORTER = gql`
  mutation DeleteBsdaTransporter($id: ID!) {
    deleteBsdaTransporter(id: $id)
  }
`;
