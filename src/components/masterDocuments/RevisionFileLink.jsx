import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { openStoredFile } from "@/lib/documentFiles";

export default function RevisionFileLink({ fileUrl }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(fileUrl || "");

  useEffect(() => { setUrl(fileUrl || ""); }, [fileUrl]);

  if (!url) return <span className="text-muted-foreground">—</span>;

  const open = async () => {
    setBusy(true);
    try {
      await openStoredFile(url);
    } catch (err) {
      toast.error(err?.message || "Falha ao abrir o PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={open} disabled={busy}>
      Abrir PDF
    </Button>
  );
}
