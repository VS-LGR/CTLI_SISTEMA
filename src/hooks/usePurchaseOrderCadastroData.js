import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";

export function usePurchaseOrderCadastroData(tenantId) {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [weights, setWeights] = useState([]);
  const [weightCerts, setWeightCerts] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [tenant, setTenant] = useState(null);

  const load = useCallback(async () => {
    if (!tenantId || !isSupabaseAuthMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [t, s, e, w, wc, ec] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
        supabase.from("supplier_registrations").select("*").eq("tenant_id", tenantId).order("name"),
        supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId).order("full_name"),
        supabase.from("standard_weight_items").select("*").eq("tenant_id", tenantId).eq("active", true).order("identification"),
        supabase.from("weight_standard_certificates").select("*").eq("tenant_id", tenantId).order("certificate_number"),
        supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", tenantId).order("equipment_name"),
      ]);
      setTenant(t.data || null);
      setSuppliers(s.data || []);
      setEmployees(e.data || []);
      setWeights(w.data || []);
      setWeightCerts(wc.data || []);
      setEnvCerts(ec.data || []);
    } catch {
      setTenant(null);
      setSuppliers([]);
      setEmployees([]);
      setWeights([]);
      setWeightCerts([]);
      setEnvCerts([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    loading,
    tenant,
    suppliers,
    employees,
    weights,
    weightCerts,
    envCerts,
    reload: load,
  };
}
