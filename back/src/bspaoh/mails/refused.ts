import { getCompanyAdminUsers } from "../../companies/database";

import {
  Mail,
  renderMail,
  formNotAccepted,
  formPartiallyRefused
} from "@td/mail";
import { Decimal } from "decimal.js";
import { getFirstTransporterSync } from "../converter";
import { PrismaBspaohWithTransporters } from "../types";
import { buildPdfAsBase64 } from "../pdf/generator";

export async function renderBspaohRefusedEmail(
  bspaoh: PrismaBspaohWithTransporters
): Promise<Mail | undefined> {
  const attachmentData = {
    file: await buildPdfAsBase64(bspaoh),
    name: `${bspaoh.id}.pdf`
  };

  const emitterCompanyAdmins = bspaoh.emitterCompanySiret
    ? await getCompanyAdminUsers(bspaoh.emitterCompanySiret)
    : [];
  const destinationCompanyAdmins = await getCompanyAdminUsers(
    bspaoh.destinationCompanySiret!
  );

  const to = emitterCompanyAdmins.map(admin => ({
    email: admin.email,
    name: admin.name ?? ""
  }));

  const cc = [...destinationCompanyAdmins].map(admin => ({
    email: admin.email,
    name: admin.name ?? ""
  }));

  // Get formNotAccepted or formPartiallyRefused mail function according to wasteAcceptationStatus value
  const mailTemplate = {
    REFUSED: formNotAccepted,
    PARTIALLY_REFUSED: formPartiallyRefused
  }[bspaoh.destinationReceptionAcceptationStatus!];
  const transporter = getFirstTransporterSync(bspaoh);
  return renderMail(mailTemplate, {
    to,
    cc,
    variables: {
      form: {
        readableId: bspaoh.id,
        wasteDetailsName:
          bspaoh.wasteType === "FOETUS"
            ? "Foetus"
            : "Pièce anatomique d'origine humaine",
        wasteDetailsCode: bspaoh.wasteCode,
        emitterCompanyName: bspaoh.emitterCompanyName,
        emitterCompanySiret: bspaoh.emitterCompanySiret,
        emitterCompanyAddress: bspaoh.emitterCompanyAddress,
        signedAt: bspaoh.destinationReceptionDate,
        recipientCompanyName: bspaoh.destinationCompanyName,
        recipientCompanySiret: bspaoh.destinationCompanySiret,
        wasteRefusalReason: bspaoh.destinationReceptionWasteRefusalReason,
        transporterIsExemptedOfReceipt: transporter
          ? transporter.transporterRecepisseIsExempted
          : "",
        transporterCompanyName: transporter
          ? transporter.transporterCompanyName
          : "",
        transporterCompanySiret: transporter
          ? transporter.transporterCompanySiret
          : "",
        transporterReceipt: transporter
          ? transporter.transporterRecepisseNumber
          : "",
        sentBy: bspaoh.emitterEmissionSignatureAuthor,
        quantityReceived: bspaoh.destinationReceptionWasteWeightValue
          ? new Decimal(bspaoh.destinationReceptionWasteWeightValue)
              .dividedBy(1000)
              .toNumber()
          : bspaoh.destinationReceptionWasteQuantityValue
      }
    },
    attachment: attachmentData
  });
}
