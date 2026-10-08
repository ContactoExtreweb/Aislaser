/** Email válido y sin caracteres que permitan manipular un enlace mailto: (?, &, %, =…) */
export const SAFE_EMAIL = /^[^\s@?&%=<>"',;:()\\]+@[^\s@?&%=<>"',;:()\\]+\.[a-z]{2,}$/i;
