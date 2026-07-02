import React from "react";
import StandardWeightPickerPanel from "@/components/shared/StandardWeightPickerPanel";

export default function PesoPadraoPointTable({
  weightItems = [],
  weightCerts = [],
  value = [],
  onChange,
  disabled = false,
  unit = "g",
}) {
  return (
    <StandardWeightPickerPanel
      weightItems={weightItems}
      weightCerts={weightCerts}
      value={value}
      onChange={onChange}
      disabled={disabled}
      unit={unit}
      compact={false}
    />
  );
}
