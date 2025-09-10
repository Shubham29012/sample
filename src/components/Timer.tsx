interface TimerProps {
  timeLeft: number;
}

export default function Timer({ timeLeft }: TimerProps) {
  return (
    <div className={`text-xl font-bold px-4 py-2 rounded-lg ${
      timeLeft <= 10 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
    }`}>
      ⏰ {timeLeft}s
    </div>
  );
}