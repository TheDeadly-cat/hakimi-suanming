export type WheelPoint = Readonly<{ x: number; y: number }>;

export type WheelSector = Readonly<{
  startLongitudeDeg: number;
  endLongitudeDeg: number;
  label: string;
}>;

export type WheelBody = Readonly<{
  bodyId: string;
  longitudeDeg: number;
  point: WheelPoint;
}>;

export function wheelPoint(
  center: number,
  radius: number,
  longitudeDeg: number
): WheelPoint {
  const radians = ((180 + longitudeDeg) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center - radius * Math.sin(radians)
  };
}

export function midLongitude(startDeg: number, endDeg: number): number {
  let span = (endDeg - startDeg + 360) % 360;
  if (span === 0) span = 360;
  return (startDeg + span / 2) % 360;
}

export function annularSectorPath(
  center: number,
  innerRadius: number,
  outerRadius: number,
  startDeg: number,
  endDeg: number
): string {
  const outerStart = wheelPoint(center, outerRadius, startDeg);
  const outerEnd = wheelPoint(center, outerRadius, endDeg);
  const innerEnd = wheelPoint(center, innerRadius, endDeg);
  const innerStart = wheelPoint(center, innerRadius, startDeg);
  const span = (endDeg - startDeg + 360) % 360;
  const largeArc = span > 180 ? 1 : 0;
  return [
    `M ${outerStart.x.toFixed(3)} ${outerStart.y.toFixed(3)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(3)} ${outerEnd.y.toFixed(3)}`,
    `L ${innerEnd.x.toFixed(3)} ${innerEnd.y.toFixed(3)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x.toFixed(3)} ${innerStart.y.toFixed(3)}`,
    "Z"
  ].join(" ");
}

export function createWheelSectors(): WheelSector[] {
  return Array.from({ length: 12 }, (_, index) => ({
    startLongitudeDeg: index * 30,
    endLongitudeDeg: (index + 1) * 30,
    label: String(index + 1)
  }));
}
