import numpy as np
from typing import List, Tuple
from scipy.spatial import Voronoi

def generate_checkerboard(rows, cols):
    return [[(i + j) % 2 for j in range(cols)] for i in range(rows)]

def generate_hex_checkerboard(rows, cols):
    layout = []
    for i in range(rows):
        row = []
        for j in range(cols):
            val = (i + j) % 2
            row.append(val)
        layout.append(row)
    return layout

def generate_hex_honeycomb_layout(rows, cols):
    layout = [[1 for _ in range(cols)] for _ in range(rows)]
    for i in range(rows):
        for j in range(cols):
            if i % 2 == 1 and j % 2 == 0:
                layout[i][j] = 0
    return layout

def generate_organic_hex_layout(rows, cols, hole_probability=0.2, jitter=0.1, spacing=1.0, seed=None):
    if seed is not None:
        np.random.seed(seed)
    
    layout = []
    row_spacing = spacing * np.sqrt(3) / 2
    
    for i in range(rows):
        for j in range(cols):
            x = j * spacing + (spacing / 2 if i % 2 else 0)
            y = i * row_spacing
            
            dx = np.random.uniform(-jitter, jitter)
            dy = np.random.uniform(-jitter, jitter)
            
            x += dx
            y += dy
            
            is_pillar = np.random.rand() > hole_probability
            layout.append((x, y, is_pillar))
    
    return layout

def generate_voronoi_layout(rows, cols, hole_probability=0.2, spacing=1.0, lloyd_iterations=0, seed=None):
    """
    Generate Voronoi tessellation-based layout using cell centers
    
    Args:
        rows: number of rows (controls density)
        cols: number of columns (controls density)
        hole_probability: probability that a cell becomes a hole
        spacing: approximate spacing between points
        lloyd_iterations: number of Lloyd's relaxation iterations (0-10)
        seed: random seed for reproducibility
    
    Returns:
        List of (x, y, is_pillar) tuples
    """
    if seed is not None:
        np.random.seed(seed)
    
    # Calculate domain size based on rows, cols, and spacing
    width = cols * spacing
    height = rows * spacing * np.sqrt(3) / 2
    
    # Number of seed points
    n_points = rows * cols
    
    # Generate random seed points within the domain
    points = np.random.rand(n_points, 2)
    points[:, 0] *= width
    points[:, 1] *= height
    
    # Apply Lloyd's relaxation to make spacing more uniform
    for _ in range(lloyd_iterations):
        vor = Voronoi(points)
        
        # Calculate centroids of Voronoi regions
        new_points = []
        for idx, region in enumerate(vor.point_region):
            region_indices = vor.regions[region]
            if -1 not in region_indices and len(region_indices) > 0:
                # Valid region - calculate centroid
                vertices = vor.vertices[region_indices]
                centroid = vertices.mean(axis=0)
                
                # Keep within bounds
                centroid[0] = np.clip(centroid[0], 0, width)
                centroid[1] = np.clip(centroid[1], 0, height)
                new_points.append(centroid)
            else:
                # Invalid region - keep original point
                new_points.append(points[idx])
        
        points = np.array(new_points)
    
    # Use the (relaxed) seed points as pillar/hole positions
    layout = []
    for x, y in points:
        is_pillar = np.random.rand() > hole_probability
        layout.append((float(x), float(y), is_pillar))
    
    return layout

def get_positions_from_square_layout(layout, spacing) -> Tuple[List[Tuple[float, float]], List[Tuple[float, float]]]:
    """Extract (x,y) positions for pillars and holes from square grid layout"""
    pillar_positions = []
    hole_positions = []
    rows = len(layout)
    cols = len(layout[0])
    
    for i in range(rows):
        for j in range(cols):
            x = j * spacing
            y = i * spacing
            if layout[i][j] == 1:
                pillar_positions.append((x, y))
            else:
                hole_positions.append((x, y))
    
    return pillar_positions, hole_positions

def get_positions_from_hex_layout(layout, spacing) -> Tuple[List[Tuple[float, float]], List[Tuple[float, float]]]:
    """Extract (x,y) positions for pillars and holes from hex grid layout"""
    pillar_positions = []
    hole_positions = []
    row_spacing = spacing * np.sqrt(3) / 2
    rows = len(layout)
    cols = len(layout[0])
    
    for i in range(rows):
        for j in range(cols):
            x = j * spacing + (spacing / 2 if i % 2 else 0)
            y = i * row_spacing
            if layout[i][j] == 1:
                pillar_positions.append((x, y))
            else:
                hole_positions.append((x, y))
    
    return pillar_positions, hole_positions

def get_positions_from_organic_layout(positions) -> Tuple[List[Tuple[float, float]], List[Tuple[float, float]]]:
    """Extract (x,y) positions for pillars and holes from organic layout"""
    pillar_positions = []
    hole_positions = []
    
    for x, y, is_pillar in positions:
        if is_pillar:
            pillar_positions.append((x, y))
        else:
            hole_positions.append((x, y))
    
    return pillar_positions, hole_positions