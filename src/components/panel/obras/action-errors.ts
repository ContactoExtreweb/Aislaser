import { unstable_isUnrecognizedActionError } from "next/navigation";

/** Mensaje cuando una Server Action no llega (sin conexión, panel recién actualizado…) */
export const actionFailed = (e: unknown) =>
  unstable_isUnrecognizedActionError(e)
    ? "El panel se ha actualizado mientras trabajabas: recarga la página (lo escrito se recupera con «Recuperarlos»)."
    : "No se ha podido conectar. Comprueba la conexión y vuelve a intentarlo; lo escrito sigue aquí.";
