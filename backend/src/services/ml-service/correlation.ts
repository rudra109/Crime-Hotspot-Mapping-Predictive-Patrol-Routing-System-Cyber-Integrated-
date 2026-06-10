export class CyberPhysicalCorrelationService {
  /**
   * Identifies physical crimes correlated with a cybercrime report.
   * e.g., mapping IP origin of a phishing attack to local physical hotspots.
   */
  public findCorrelations(cybercrimeLocation: { lat: number, lng: number }, physicalCrimes: any[]) {
    const radiusKm = 5;
    
    const correlated = physicalCrimes.filter(crime => {
      // Basic distance check (Haversine formula placeholder)
      const dist = this.haversine(cybercrimeLocation, {
        lat: crime.location.coordinates[1],
        lng: crime.location.coordinates[0]
      });
      return dist <= radiusKm;
    });

    return correlated.map(c => ({
      physicalCrimeId: c.id,
      correlationCoefficient: 0.85, // Mock confidence
      distanceKm: this.haversine(cybercrimeLocation, { lat: c.location.coordinates[1], lng: c.location.coordinates[0] })
    }));
  }

  private haversine(p1: {lat: number, lng: number}, p2: {lat: number, lng: number}) {
    // Simplified placeholder
    const R = 6371; 
    const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
    const dLng = (p2.lng - p1.lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1.lat * (Math.PI / 180)) * Math.cos(p2.lat * (Math.PI / 180)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
}
