import { Point, Shape, Zone } from '@/types';
import { ZONE_CONFIG } from '@/lib/constants';
import { GeometryUtils } from './geometry';

export const ZoneUtils = {
  getZoneForPoint(point: Point, shape: Shape): Zone {
    if (GeometryUtils.pointInShape(point, shape)) return "INSIDE";
    const distanceInMm = GeometryUtils.distanceToShapeOutline(point, shape) / ZONE_CONFIG.PIXELS_PER_MM;
    return distanceInMm <= ZONE_CONFIG.NEAR_DISTANCE_MM ? "OUTSIDE_NEAR" : "OUTSIDE_FAR";
  }
};