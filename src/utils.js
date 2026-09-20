export function distanceKm(from, to) {
  const radius = 6371
  const lat = ((to.lat - from.lat) * Math.PI) / 180
  const lng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(lng / 2) ** 2

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(distance) {
  if (distance < 1) return `${Math.round(distance * 1000)}m`
  return `${distance.toFixed(1)}km`
}
