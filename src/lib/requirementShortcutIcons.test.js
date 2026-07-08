import { ArrowRight, Certificate, Cube, Wrench } from "@phosphor-icons/react";
import { getRequirementShortcutIcon } from "./requirementShortcutIcons";

describe("requirementShortcutIcons", () => {
  test("mapeia chaves conhecidas", () => {
    expect(getRequirementShortcutIcon("fichas")).toBe(Wrench);
    expect(getRequirementShortcutIcon("cad-pesos")).toBe(Cube);
    expect(getRequirementShortcutIcon("cad-cert-peso")).toBe(Certificate);
  });

  test("fallback para chave desconhecida", () => {
    expect(getRequirementShortcutIcon("desconhecido")).toBe(ArrowRight);
  });
});
