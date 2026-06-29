import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cadastroSectionPath } from "@/lib/cadastroSections";
import { Link } from "react-router-dom";

export default function ProposalClientSection({
  endCustomers = [],
  endCustomerId,
  snapshot,
  onEndCustomerChange,
  onSnapshotChange,
}) {
  const setSnap = (key, value) => {
    onSnapshotChange({ ...snapshot, [key]: value });
  };

  const handleCustomerSelect = (id) => {
    onEndCustomerChange(id);
    const customer = endCustomers.find((c) => c.id === id);
    if (customer) {
      onSnapshotChange({
        ...snapshot,
        company: customer.name || "",
        address: customer.full_address || "",
        attention_to: customer.representative_name || snapshot.attention_to || "",
        phone: customer.phone || "",
        email: customer.email || "",
        cnpj: customer.cnpj || "",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Cliente</h3>
        <Link to={cadastroSectionPath("clientes")} className="text-xs text-blue-600 hover:underline">
          Abrir cadastro de clientes
        </Link>
      </div>
      <div>
        <Label className="text-xs">Vincular ao cadastro (opcional)</Label>
        <select
          className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
          value={endCustomerId || ""}
          onChange={(e) => handleCustomerSelect(e.target.value)}
        >
          <option value="">— Manual —</option>
          {endCustomers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-xs">Empresa *</Label>
          <Input className="mt-1" value={snapshot.company || ""} onChange={(e) => setSnap("company", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Endereço</Label>
          <Input className="mt-1" value={snapshot.address || ""} onChange={(e) => setSnap("address", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Departamento</Label>
          <Input className="mt-1" value={snapshot.department || ""} onChange={(e) => setSnap("department", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">A/C</Label>
          <Input className="mt-1" value={snapshot.attention_to || ""} onChange={(e) => setSnap("attention_to", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Telefone(s)</Label>
          <Input className="mt-1" value={snapshot.phone || ""} onChange={(e) => setSnap("phone", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input className="mt-1" type="email" value={snapshot.email || ""} onChange={(e) => setSnap("email", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">CNPJ</Label>
          <Input className="mt-1" value={snapshot.cnpj || ""} onChange={(e) => setSnap("cnpj", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
