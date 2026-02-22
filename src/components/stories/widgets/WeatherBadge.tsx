import { cn } from "@/lib/utils";

interface WeatherBadgeProps {
  weather: string | null;
  high?: number | null;
  low?: number | null;
  tempHigh?: number | null;
  tempLow?: number | null;
  className?: string;
}

function getWeatherEmoji(weather: string | null): string {
  if (!weather) return "🌤";

  const w = weather.toLowerCase();

  if (w.includes("thunder") || w.includes("storm")) return "⛈";
  if (w.includes("snow") || w.includes("blizzard") || w.includes("flurr")) return "🌨";
  if (w.includes("sleet") || w.includes("freezing rain") || w.includes("ice")) return "🧊";
  if (w.includes("heavy rain") || w.includes("downpour")) return "🌧";
  if (w.includes("rain") || w.includes("drizzle") || w.includes("shower")) return "🌧";
  if (w.includes("fog") || w.includes("mist") || w.includes("haze")) return "🌫";
  if (w.includes("overcast")) return "☁️";
  if (w.includes("cloud") || w.includes("partly")) return "⛅";
  if (w.includes("clear") || w.includes("sunny") || w.includes("sun")) return "☀️";
  if (w.includes("wind") || w.includes("gust")) return "💨";
  if (w.includes("hot") || w.includes("heat")) return "🔥";

  return "🌤";
}

export function WeatherBadge({
  weather,
  high,
  low,
  tempHigh,
  tempLow,
  className,
}: WeatherBadgeProps) {
  const hi = high ?? tempHigh ?? null;
  const lo = low ?? tempLow ?? null;

  if (!weather && hi === null && lo === null) return null;

  const emoji = getWeatherEmoji(weather);
  const hasTemp = hi !== null || lo !== null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
        "bg-white/10 backdrop-blur-md border border-white/10",
        "text-white/90 text-xs font-medium",
        className
      )}
    >
      <span className="text-sm">{emoji}</span>

      {weather && (
        <span className="capitalize max-w-[80px] truncate">{weather}</span>
      )}

      {hasTemp && (
        <span className="text-white/60">
          {hi !== null && lo !== null
            ? `${lo}°–${hi}°`
            : hi !== null
            ? `${hi}°`
            : `${lo}°`}
        </span>
      )}
    </div>
  );
}
