import numpy as np
import trimesh
from shapely.geometry import Polygon, Point
from typing import List, Tuple

def create_pillar(radius=0.5, height=4.0, sections=32):
    return trimesh.creation.cylinder(radius=radius, height=height, sections=sections)

def create_pillars_from_positions(positions: List[Tuple[float, float]], radius=0.5, height=4.0, floor_thickness=0.0):
    """Create pillar geometry from a list of (x, y) positions"""
    pillars = []
    
    for x, y in positions:
        pillar = create_pillar(radius, height)
        pillar.apply_translation([x, y, floor_thickness + height / 2])
        pillars.append(pillar)
    
    return trimesh.util.concatenate(pillars)

def get_bounds_from_positions(positions: List[Tuple[float, float]], padding_x=0.0, padding_y=0.0):
    positions = np.array(positions)
    min_x, min_y = positions.min(axis=0)
    max_x, max_y = positions.max(axis=0)
    return min_x - padding_x, max_x + padding_x, min_y - padding_y, max_y + padding_y

def create_floor_with_holes(holes: List[Tuple[float, float]], floor_thickness, padding_x, padding_y, hole_radius, bounds_positions=None):
    positions_for_bounds = bounds_positions if bounds_positions else holes
    min_x, max_x, min_y, max_y = get_bounds_from_positions(positions_for_bounds, padding_x, padding_y)
    
    floor_outline = Polygon([
        (min_x, min_y),
        (max_x, min_y),
        (max_x, max_y),
        (min_x, max_y)
    ])
    
    for x, y in holes:
        floor_outline = floor_outline.difference(Point(x, y).buffer(hole_radius))
    
    floor = trimesh.creation.extrude_polygon(floor_outline, floor_thickness)
    return floor

def create_walls_from_bounds(min_x, max_x, min_y, max_y, wall_height, wall_thickness=0.5):
    width = max_x - min_x
    depth = max_y - min_y
    walls = []
    
    # Front wall
    front = trimesh.creation.box([width + 2 * wall_thickness, wall_thickness, wall_height])
    front.apply_translation([(min_x + max_x) / 2, min_y - wall_thickness / 2, wall_height / 2])
    walls.append(front)
    
    # Back wall
    back = trimesh.creation.box([width + 2 * wall_thickness, wall_thickness, wall_height])
    back.apply_translation([(min_x + max_x) / 2, max_y + wall_thickness / 2, wall_height / 2])
    walls.append(back)
    
    # Left wall
    left = trimesh.creation.box([wall_thickness, depth, wall_height])
    left.apply_translation([min_x - wall_thickness / 2, (min_y + max_y) / 2, wall_height / 2])
    walls.append(left)
    
    # Right wall
    right = trimesh.creation.box([wall_thickness, depth, wall_height])
    right.apply_translation([max_x + wall_thickness / 2, (min_y + max_y) / 2, wall_height / 2])
    walls.append(right)
    
    return trimesh.boolean.union(walls)