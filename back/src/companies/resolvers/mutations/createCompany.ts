import {
  CollectorType,
  CompanyType,
  CompanyVerificationMode,
  CompanyVerificationStatus,
  Prisma,
  WasteProcessorType
} from "@prisma/client";
import { convertUrls } from "../../database";
import { prisma } from "@td/prisma";
import { applyAuthStrategies, AuthType } from "../../../auth";
import { sendMail } from "../../../mailer/mailing";
import { checkIsAuthenticated } from "../../../common/permissions";
import { MutationResolvers } from "../../../generated/graphql/types";
import { randomNumber } from "../../../utils";
import { renderMail, verificationProcessInfo } from "@td/mail";
import { deleteCachedUserRoles } from "../../../common/redis/users";
import {
  cleanClue,
  isClosedCompany,
  isFRVat,
  isSiret,
  isVat,
  CLOSED_COMPANY_ERROR,
  isProfessional
} from "@td/constants";
import { searchCompany } from "../../search";
import {
  addToGeocodeCompanyQueue,
  addToSetCompanyDepartementQueue
} from "../../../queue/producers/company";
import { UserInputError } from "../../../common/errors";
import {
  companyTypesValidationSchema,
  isForeignTransporter
} from "../../validation";
import { sendFirstOnboardingEmail } from "./verifyCompany";
import { sendVerificationCodeLetter } from "../../../common/post";
import { isGenericEmail } from "@td/constants";

/**
 * Create a new company and associate it to a user
 * who becomes the first admin of the company
 * @param companyInput
 * @param userId
 */
const createCompanyResolver: MutationResolvers["createCompany"] = async (
  parent,
  { companyInput },
  context
) => {
  applyAuthStrategies(context, [AuthType.Session]);
  const user = checkIsAuthenticated(context);

  const { companyTypes, collectorTypes, wasteProcessorTypes } =
    await companyTypesValidationSchema.validate(companyInput);

  const {
    codeNaf,
    gerepId,
    companyName: name,
    givenName,
    address,
    transporterReceiptId,
    traderReceiptId,
    brokerReceiptId,
    vhuAgrementDemolisseurId,
    vhuAgrementBroyeurId,
    allowBsdasriTakeOverWithoutSignature,
    contact,
    contactEmail,
    contactPhone
  } = companyInput;

  const ecoOrganismeAgreements =
    companyInput.ecoOrganismeAgreements?.map(a => a.href) || [];
  const siret = companyInput.siret ? cleanClue(companyInput.siret) : null;
  const vatNumber = companyInput.vatNumber
    ? cleanClue(companyInput.vatNumber)
    : null;
  const orgId = siret ?? (vatNumber as string);

  if (isVat(vatNumber)) {
    if (isFRVat(vatNumber)) {
      throw new UserInputError(
        "Impossible de créer un établissement identifié par un numéro de TVA français, merci d'indiquer un SIRET"
      );
    }
    if (companyTypes.join("") !== CompanyType.TRANSPORTER) {
      throw new UserInputError(
        "Impossible de créer un établissement identifié par un numéro de TVA d'un autre type que TRANSPORTER"
      );
    }
  } else if (!isSiret(siret)) {
    throw new UserInputError(
      "Impossible de créer un établissement sans un SIRET valide ni un numéro de TVA étranger valide"
    );
  }

  const existingCompany = await prisma.company.findUnique({
    where: {
      orgId
    }
  });

  if (existingCompany) {
    throw new UserInputError(
      `Cette entreprise existe déjà dans Trackdéchets. Contactez l'administrateur de votre entreprise afin qu'il puisse vous inviter à rejoindre l'organisation`
    );
  }

  // check if orgId exists in public databases or in AnonymousCompany
  const companyInfo = await searchCompany(orgId);

  if (isClosedCompany(companyInfo)) {
    throw new UserInputError(CLOSED_COMPANY_ERROR);
  }

  if (companyTypes.includes("ECO_ORGANISME") && siret) {
    const ecoOrganismeExists = await prisma.ecoOrganisme.findUnique({
      where: { siret }
    });
    if (!ecoOrganismeExists) {
      throw new UserInputError(
        "Cette entreprise ne fait pas partie de la liste des éco-organismes reconnus par Trackdéchets. Contactez-nous si vous pensez qu'il s'agit d'une erreur : contact@trackdechets.beta.gouv.fr"
      );
    }

    if (ecoOrganismeAgreements.length < 1) {
      throw new UserInputError(
        "L'URL de l'agrément de l'éco-organisme est requis."
      );
    }
  } else if (ecoOrganismeAgreements.length > 0) {
    throw new UserInputError(
      "Impossible de lier des agréments d'éco-organisme : l'entreprise n'est pas un éco-organisme."
    );
  }

  const companyCreateInput: Prisma.CompanyCreateInput = {
    orgId,
    siret,
    vatNumber,
    codeNaf,
    gerepId,
    name: companyInfo?.name ?? name,
    givenName,
    address: companyInfo?.address ?? address,
    companyTypes: { set: companyTypes as CompanyType[] },
    collectorTypes: collectorTypes
      ? { set: collectorTypes as CollectorType[] }
      : undefined,
    wasteProcessorTypes: wasteProcessorTypes
      ? { set: wasteProcessorTypes as WasteProcessorType[] }
      : undefined,
    securityCode: randomNumber(4),
    verificationCode: randomNumber(5).toString(),
    ecoOrganismeAgreements: {
      set: ecoOrganismeAgreements
    },
    allowBsdasriTakeOverWithoutSignature: Boolean(
      allowBsdasriTakeOverWithoutSignature
    ),
    contact,
    contactEmail,
    contactPhone
  };

  if (!!transporterReceiptId) {
    companyCreateInput.transporterReceipt = {
      connect: { id: transporterReceiptId }
    };
  }

  if (!!traderReceiptId) {
    companyCreateInput.traderReceipt = {
      connect: { id: traderReceiptId }
    };
  }

  if (!!brokerReceiptId) {
    companyCreateInput.brokerReceipt = {
      connect: { id: brokerReceiptId }
    };
  }

  if (!!vhuAgrementDemolisseurId) {
    companyCreateInput.vhuAgrementDemolisseur = {
      connect: { id: vhuAgrementDemolisseurId }
    };
  }

  if (!!vhuAgrementBroyeurId) {
    companyCreateInput.vhuAgrementBroyeur = {
      connect: { id: vhuAgrementBroyeurId }
    };
  }

  // Foreign transporter: automatically verify (no action needed)
  if (
    isForeignTransporter({
      companyTypes: companyTypes as CompanyType[],
      vatNumber
    })
  ) {
    companyCreateInput.verificationMode = CompanyVerificationMode.AUTO;
    companyCreateInput.verificationStatus = CompanyVerificationStatus.VERIFIED;
    companyCreateInput.verifiedAt = new Date();
  }

  const companyAssociation = await prisma.companyAssociation.create({
    data: {
      user: { connect: { id: user.id } },
      company: {
        create: companyCreateInput
      },
      role: "ADMIN"
    },
    include: { company: true }
  });
  await deleteCachedUserRoles(user.id);
  let company = companyAssociation.company;

  // fill firstAssociationDate field if null (no need to update it if user was previously already associated)
  await prisma.user.updateMany({
    where: { id: user.id, firstAssociationDate: null },
    data: { firstAssociationDate: new Date() }
  });

  // Company needs to be verified
  if (process.env.VERIFY_COMPANY === "true") {
    if (
      isProfessional(companyTypes) &&
      !isForeignTransporter({
        companyTypes: companyTypes as CompanyType[],
        vatNumber
      })
    ) {
      // Email is too generic. Automatically send a verification letter
      if (isGenericEmail(user.email, company.name)) {
        await sendVerificationCodeLetter(company);
        company = await prisma.company.update({
          where: { orgId: company.orgId },
          data: {
            verificationStatus: CompanyVerificationStatus.LETTER_SENT,
            verificationMode: CompanyVerificationMode.LETTER
          }
        });
      }
      // Verify manually by admin
      else {
        await sendMail(
          renderMail(verificationProcessInfo, {
            to: [{ email: user.email, name: user.name }],
            variables: { company }
          })
        );
      }
    }
  }
  if (company.siret && company.address && companyInfo.codeCommune) {
    // Fill latitude, longitude and departement asynchronously
    addToGeocodeCompanyQueue({
      siret: company.siret,
      address: company.address
    });
    addToSetCompanyDepartementQueue({
      siret: company.siret,
      codeCommune: companyInfo.codeCommune
    });
  }

  // If the company is NOT professional or is foreign transporter, send onboarding email
  // (professional onboarding mail is sent on verify)
  if (
    !isProfessional(companyTypes) ||
    isForeignTransporter({
      companyTypes: companyTypes as CompanyType[],
      vatNumber
    })
  ) {
    await sendFirstOnboardingEmail(companyInput, user);
  }

  return convertUrls(company);
};

export default createCompanyResolver;
