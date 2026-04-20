import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import type { Pilar } from "../types";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface RadarPilaresProps {
  pilares: Pilar[];
  pcts: number[]; // 0..1 por pilar
  clientName: string;
}

export function RadarPilares({ pilares, pcts, clientName }: RadarPilaresProps) {
  const data = {
    labels: pilares.map((p) => p.name.split(" ")[0]),
    datasets: [
      {
        label: clientName,
        data: pcts.map((p) => Math.round(p * 100)),
        backgroundColor: "rgba(28,61,46,0.15)",
        borderColor: "#4A7C5F",
        borderWidth: 2,
        pointBackgroundColor: "#4A7C5F",
        pointRadius: 4,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { display: false },
        grid: { color: "#DDD8D0" },
        pointLabels: { font: { size: 11, family: "Lato" }, color: "#718096" },
      },
    },
    plugins: { legend: { display: false } },
  } as const;
  return (
    <div className="relative h-[300px] w-full">
      <Radar data={data} options={options} />
    </div>
  );
}
