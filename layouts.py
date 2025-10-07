import numpy as np
from typing import List, Tuple

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