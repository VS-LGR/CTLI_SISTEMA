import React, { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Question, Play } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CaretRight } from "@phosphor-icons/react";
import { getHelpCatalogModulesForUser } from "@/lib/help/helpModules";
import { useModuleTourActions } from "@/components/help/ModuleTourProvider";
import { useAuth } from "@/context/AuthContext";

export default function HelpPage() {
  const { user } = useAuth();
  const { currentTenant } = useOutletContext() || {};
  const modules = getHelpCatalogModulesForUser({
    tenant: currentTenant,
    role: user?.role,
    user,
  });
  const { openTour } = useModuleTourActions();
  const [openKey, setOpenKey] = useState(modules[0]?.moduleKey || null);

  return (
    <div className="max-w-3xl mx-auto space-y-6 min-w-0 w-full">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 text-foreground min-w-0">
          <Question size={28} weight="duotone" className="text-primary shrink-0" />
          <h1 className="font-display text-xl sm:text-2xl font-semibold truncate">Ajuda</h1>
        </div>
        <p className="text-sm text-muted-foreground break-words">
          Passo a passo das funções disponíveis para o seu nível de acesso. Na primeira visita a cada
          módulo, o tutorial também aparece automaticamente (exceto Administrador CTLI).
        </p>
      </div>

      <div className="space-y-3 min-w-0">
        {modules.map((mod) => {
          const isOpen = openKey === mod.moduleKey;
          return (
            <Card key={mod.moduleKey} className="border-border min-w-0 overflow-hidden">
              <Collapsible
                open={isOpen}
                onOpenChange={(next) => setOpenKey(next ? mod.moduleKey : null)}
              >
                <CardHeader className="p-0">
                  <CollapsibleTrigger
                    className="flex w-full items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 text-left hover:bg-accent rounded-t-lg min-w-0"
                    data-testid={`help-module-${mod.moduleKey}`}
                  >
                    <CaretRight
                      size={16}
                      className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                    <CardTitle className="text-sm sm:text-base font-semibold flex-1 min-w-0 break-words">
                      {mod.title}
                    </CardTitle>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-3 sm:px-4 space-y-4 min-w-0">
                    <ol className="space-y-3 list-decimal list-outside ml-4 text-sm text-foreground/90">
                      {(mod.steps || []).map((step, i) => (
                        <li key={i} className="leading-relaxed pl-1 min-w-0">
                          <span className="font-medium text-foreground break-words">{step.title}</span>
                          <span className="block text-muted-foreground mt-0.5 break-words">{step.body}</span>
                        </li>
                      ))}
                    </ol>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      data-tour="tour-help-ver-tutorial"
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
        {!modules.length && (
          <p className="text-sm text-muted-foreground">Não há tutoriais para o seu nível de acesso.</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Precisa de voltar ao início?{" "}
        <Link to="/dashboard" className="text-primary hover:underline">
          Ir para o Dashboard
        </Link>
      </p>

      <p className="text-xs text-muted-foreground">
        Documentos legais:{" "}
        <Link to="/termos" className="text-primary hover:underline">
          Termos de Adesão
        </Link>
        {" · "}
        <Link to="/licenca" className="text-primary hover:underline">
          Licença
        </Link>
        {" "}(© CTLI — todos os direitos reservados).
      </p>
    </div>
  );
}
