/** Marca opção no estilo do formulário RE-7.2A: (X) ou ( ) */
export function markOption(current, expected) {
  return current === expected ? "(X)" : "( )";
}

export function markChecked(isChecked) {
  return isChecked ? "(X)" : "( )";
}
