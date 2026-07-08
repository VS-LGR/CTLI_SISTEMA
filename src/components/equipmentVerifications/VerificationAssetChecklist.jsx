import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MONTH_KEYS,
  MONTH_LABELS,
  formatAssetLabel,
  getVerificationChecklist,
  verificationValueOptions,
} from "@/lib/equipmentVerifications/verificationChecklist";

export default function VerificationAssetChecklist({
  kind,
  asset,
  responses = {},
  responsible = {},
  onCellChange,
  onResponsibleChange,
}) {
  const checklist = getVerificationChecklist(kind);
  const valueOpts = verificationValueOptions(kind);
  const label = formatAssetLabel(asset, kind);

  return (
    <Card className="border-slate-200 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs min-w-[1100px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2 text-left sticky left-0 bg-slate-50 min-w-[200px]">Item</th>
              {MONTH_LABELS.map((m) => (
                <th key={m} className="p-2 text-center min-w-[72px]">{m.slice(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {checklist.map((item) => (
              <tr key={item.key} className="border-t border-slate-100">
                <td className="p-2 sticky left-0 bg-white font-medium text-slate-800">{item.label}</td>
                {MONTH_KEYS.map((m) => (
                  <td key={m} className="p-1">
                    <select
                      className="w-full h-8 rounded border border-slate-200 bg-white px-1 text-xs"
                      value={responses[item.key]?.[m] || ""}
                      onChange={(e) => onCellChange(item.key, m, e.target.value)}
                    >
                      {valueOpts.map((o) => (
                        <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-50/80">
              <td className="p-2 sticky left-0 bg-slate-50 font-medium">Responsável</td>
              {MONTH_KEYS.map((m) => (
                <td key={m} className="p-1">
                  <Input
                    className="h-8 text-xs px-1"
                    value={responsible[m] || ""}
                    onChange={(e) => onResponsibleChange(m, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
