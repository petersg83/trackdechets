import React, { useCallback } from "react";
import { InfoIconCode, InfoWithIconProps } from "./infoWithIconTypes";
import { getLabelValue } from "./infoWithIconUtils";
import "./infoWithIcon.scss";
import { NON_RENSEIGNE } from "../../../common/wordings/dashboard/wordingsDashboard";

function InfoWithIcon({
  labelCode,
  info,
  editableInfos,
  hasEditableInfos,
  onClick,
  isDisabled
}: InfoWithIconProps) {
  const labelValue = getLabelValue(labelCode);

  const formatTranporterPlates = useCallback(
    (plates?: string | string[] | null): string => {
      if (Array.isArray(plates)) {
        return plates.join(", ");
      }

      return !!plates ? plates : NON_RENSEIGNE;
    },
    []
  );

  const customInfo = editableInfos?.customInfo || NON_RENSEIGNE;
  return !hasEditableInfos ? (
    <p className={`label-icon label-icon__${labelCode}`}>
      {!info ? labelValue : `${labelValue} ${info}`}
    </p>
  ) : (
    <button
      className="label-icon-editable"
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={labelValue}
    >
      <p className={`label-icon label-icon__${labelCode}`}>
        {labelCode === InfoIconCode.CustomInfo
          ? customInfo
          : formatTranporterPlates(editableInfos?.transporterNumberPlate)}
      </p>
      {!isDisabled && <span className="edition-pencil-icon" />}
    </button>
  );
}

export default InfoWithIcon;
