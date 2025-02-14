import {
  Bsda,
  BsdaDestination,
  BsdaEcoOrganisme,
  BsdaEmitter,
  BsdaMetadata,
  Bsdasri,
  BsdasriDestination,
  BsdasriEcoOrganisme,
  BsdasriEmitter,
  BsdasriStatus,
  BsdasriTransporter,
  BsdasriType,
  BsdaStatus,
  BsdaTransporter,
  BsdaType,
  BsdaWorker,
  BsdType,
  BsffDestination,
  BsffEmitter,
  BsffPackaging,
  BsffStatus,
  BsffTransporter,
  BsffType,
  BsvhuDestination,
  BsvhuEmitter,
  BsvhuStatus,
  BsvhuTransporter,
  Emitter,
  EmitterType,
  FormEcoOrganisme,
  FormMetadata,
  FormStatus,
  InitialBsda,
  InitialBsdasri,
  InitialFormFraction,
  Maybe,
  Recipient,
  RevisionRequestApprovalStatus,
  RevisionRequestStatus,
  Scalars,
  TemporaryStorageDetail,
  Transporter
} from "@td/codegen-ui";

export enum BsdTypename {
  Bsdd = "Form",
  Bsda = "Bsda",
  Bsdasri = "Bsdasri",
  Bsvhu = "Bsvhu",
  Bsff = "Bsff"
}

export const BsdStatusCode = {
  ...FormStatus,
  ...BsdaStatus,
  ...BsffStatus,
  ...BsdasriStatus,
  ...BsvhuStatus,
  ...RevisionRequestStatus,
  ...RevisionRequestApprovalStatus
};

export enum ReviewStatusLabel {
  Pending = "En attente de révision",
  Accepted = "Révision approuvée",
  Refused = "Révision refusée",
  Cancelled = "Révision annulée"
}

type TBsdStatusCodeKeys = keyof typeof BsdStatusCode;
export type TBsdStatusCode = (typeof BsdStatusCode)[TBsdStatusCodeKeys];
export interface BsdDisplay {
  id: string;
  readableid: string;
  customId?: string;
  type: BsdType;
  isDraft: boolean;
  status: TBsdStatusCode;
  wasteDetails: {
    code?: Maybe<string>;
    name?: Maybe<string>;
    weight?: Maybe<number>;
  };
  isTempStorage?: Maybe<boolean>;
  emitter?: Maybe<Emitter> &
    Maybe<BsdaEmitter> &
    Maybe<BsdasriEmitter> &
    Maybe<BsvhuEmitter> &
    Maybe<BsffEmitter>;
  emitterType?: Maybe<EmitterType>;
  destination?:
    | Maybe<Recipient>
    | Maybe<BsdasriDestination>
    | Maybe<BsdaDestination>
    | Maybe<BsvhuDestination>
    | Maybe<BsffDestination>;
  transporter?:
    | Maybe<Transporter>
    | Maybe<BsdaTransporter>
    | Maybe<BsdasriTransporter>
    | Maybe<BsvhuTransporter>
    | Maybe<BsffTransporter>;
  transporters?: Transporter[] | BsdaTransporter[];
  ecoOrganisme?:
    | Maybe<FormEcoOrganisme>
    | Maybe<BsdaEcoOrganisme>
    | Maybe<BsdasriEcoOrganisme>;
  updatedAt?: Maybe<string> | Maybe<Scalars["DateTime"]>;
  emittedByEcoOrganisme?: Maybe<boolean> | Maybe<BsdaEcoOrganisme>;
  worker?: Maybe<BsdaWorker>;
  bsdWorkflowType?:
    | Maybe<BsdaType>
    | BsdasriType
    | BsffType
    | Maybe<EmitterType>;
  grouping?:
    | Maybe<Array<InitialFormFraction>>
    | Maybe<Array<InitialBsdasri>>
    | Array<BsffPackaging>
    | Maybe<Array<InitialBsda>>;
  groupedIn?: Maybe<Bsda>;
  forwardedIn?: Maybe<Bsda>;
  synthesizing?: Maybe<Array<InitialBsdasri>>;
  temporaryStorageDetail?: Maybe<TemporaryStorageDetail>;
  allowDirectTakeOver?: Maybe<Scalars["Boolean"]>;
  transporterCustomInfo?: string | Maybe<string[]>;
  transporterNumberPlate?: string | Maybe<string[]>;
  packagings?: Array<BsffPackaging>;
  synthesizedIn?: Maybe<Bsdasri>;
  metadata?: FormMetadata | BsdaMetadata;
}

export enum WorkflowDisplayType {
  GRP = "Groupement",
  TRANSIT = "Transit",
  SYNTH = "Synth",
  TOURNEE = "Tournée dédiée",
  ANNEXE_1 = "Annexe 1",
  ANNEXE_2 = "Regroupement",
  RECONDITIONNEMENT = "Reconditionnement",

  DEFAULT = ""
}
