import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Question, Play } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CaretRight } from "@phosphor-icons/react";
import { getHelpCatalogModules } from "@/lib/help/helpModules";
import { useModuleTourActions } from "@/components/help/ModuleTourProvider";

export default function HelpPage() {
  const modules = getHelpCatalogModules();
  const { openTour } = useModuleTourActions();
  const [openKey, setOpenKey] = useState(modules[0]?.moduleKey || null);

  return (
    <div className="max-w-3xl mx-auto space-y-6 min-w-0 w-full">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 text-slate-800 min-w-0">
          <Question size={28} weight="duotone" className="text-blue-600 shrink-0" />
          <h1 className="font-display text-xl sm:text-2xl font-semibold truncate">Ajuda</h1>
        </div>
        <p className="text-sm text-slate-600 break-words">
          Passo a passo para criação de documentos e cadastros. Na primeira visita a cada módulo,
          o tutorial também aparece automaticamente (exceto Administrador CTLI).
        </p>
      </div>

      <div className="space-y-3 min-w-0">
        {modules.map((mod) => {
          const isOpen = openKey === mod.moduleKey;
          return (
            <Card key={mod.moduleKey} className="border-slate-200 min-w-0 overflow-hidden">
              <Collapsible
                open={isOpen}
                onOpenChange={(next) => setOpenKey(next ? mod.moduleKey : null)}
              >
                <CardHeader className="p-0">
                  <CollapsibleTrigger
                    className="flex w-full items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 text-left hover:bg-slate-50 rounded-t-lg min-w-0"
                    data-testid={`help-module-${mod.moduleKey}`}
                  >
                    <CaretRight
                      size={16}
                      className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                    <CardTitle className="text-sm sm:text-base font-semibold flex-1 min-w-0 break-words">
                      {mod.title}
                    </CardTitle>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-3 sm:px-4 space-y-4 min-w-0">
                    <ol className="space-y-3 list-decimal list-outside ml-4 text-sm text-slate-700">
                      {(mod.steps || []).map((step, i) => (
                        <li key={i} className="leading-relaxed pl-1 min-w-0">
                          <span className="font-medium text-slate-900 break-words">{step.title}</span>
                          <span className="block text-slate-600 mt-0.5 break-words">{step.body}</span>
                        </li>
                      ))}
                    </ol>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => openTour(mod.moduleKey)}
                    >
                      <Play size={16} className="mr-1.5 shrink-0" /> Ver tutorial
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        Precisa de voltar ao início?{" "}
        <Link to="/dashboard" className="text-blue-600 hover:underline">
          Ir para o Dashboard
        </Link>
      </p>
    </div>
  );
}
