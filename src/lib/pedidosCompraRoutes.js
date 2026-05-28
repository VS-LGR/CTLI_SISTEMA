export const PEDIDOS_LIST_PATH = "/pedidos-compra";
export const PEDIDOS_NEW_PATH = `${PEDIDOS_LIST_PATH}/nova`;

export function pedidoEditorPath(id) {
  return `${PEDIDOS_LIST_PATH}/${id}`;
}

export function isPedidosCompraPath(pathname) {
  return pathname.startsWith(PEDIDOS_LIST_PATH);
}
