start -- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create basic schema for Dev A Day 1
CREATE TYPE crime_type_enum AS ENUM ('theft', 'assault', 'cybercrime', 'traffic', 'burglary', 'fraud');

CREATE TABLE IF NOT EXISTS crime_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type crime_type_enum,
  severity INT,
  location GEOMETRY(Point, 4326),
  location_address TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- Note: More tables from the roadmap will be added as entities are created via TypeORM migrations,
-- but this initializes the extension and a base table.
