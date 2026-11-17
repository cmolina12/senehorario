import type { Metadata } from "next";
import { Planner } from "@/components/planner/Planner";

export const metadata: Metadata = {
  title: "Planificador",
  description:
    "Busca tus cursos de Uniandes, agrega secciones y recorre todas las combinaciones de horario sin choques.",
  alternates: { canonical: "/planning" },
};

export default function PlanningPage() {
  return <Planner />;
}
