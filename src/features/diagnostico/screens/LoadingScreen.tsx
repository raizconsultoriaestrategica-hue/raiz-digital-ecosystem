import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen flex-col items-center justify-center bg-off-white px-8"
    >
      <div
        className="mb-6 h-16 w-16 animate-spin rounded-full border-[3px] border-verde-raiz/15 border-t-verde-raiz"
        style={{ animationDuration: "0.8s" }}
      />
      <h3 className="font-display text-2xl font-semibold text-quase-preto">
        Processando seu diagnóstico…
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-quase-preto/60">
        Cruzando os 7 pilares com a dor relatada e a meta para montar o plano recomendado.
      </p>
    </motion.div>
  );
}
