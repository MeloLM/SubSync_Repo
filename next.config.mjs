/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Rete di sicurezza per lo Scanner IA: l'immagine dello scontrino viaggia come
    // argomento (base64) di una Server Action. Il default è 1MB → foto da telefono
    // fallirebbero. Insieme alla compressione client-side (image-scanner) tiene il
    // payload ampiamente sotto soglia.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
