import numpy as np
from typing import List, Tuple, Optional
from scipy.spatial import Voronoi

# Numba import and JIT-compiled function
try:
    from numba import jit
    NUMBA_AVAILABLE = True
    
    @jit(nopython=True)
    def _compute_voronoi_centroids(vertices, regions_array, region_sizes, point_region, 
                                   old_points, width, height):
        """JIT-compiled centroid calculation for Lloyd's relaxation"""
        n_points = len(old_points)
        new_points = old_points.copy()
        
        for idx in range(n_points):
            region_idx = point_region[idx]
            region_size = region_sizes[region_idx]
            
            if region_size == 0:
                continue
            
            # Check for unbounded region (-1 vertex index)
            has_infinite = False
            for i in range(region_size):
                if regions_array[region_idx, i] == -1:
                    has_infinite = True
                    break
            
            if has_infinite:
                continue
            
            # Calculate centroid
            cx, cy = 0.0, 0.0
            for i in range(region_size):
                vi = regions_array[region_idx, i]
                cx += vertices[vi, 0]
                cy += vertices[vi, 1]
            
            cx /= region_size
            cy /= region_size
            
            # Clip to bounds
            if cx < 0:
                cx = 0.0
            elif cx > width:
                cx = width
            
            if cy < 0:
                cy = 0.0
            elif cy > height:
                cy = height
            
            new_points[idx, 0] = cx
            new_points[idx, 1] = cy
        
        return new_points
    
    def _warmup_numba():
        """Pre-compile the JIT function with a tiny dataset"""
        warmup_points = np.random.rand(10, 2) * 10
        warmup_vor = Voronoi(warmup_points)
        
        max_size = max(len(r) for r in warmup_vor.regions)
        regions = np.full((len(warmup_vor.regions), max_size), -1, dtype=np.int32)
        sizes = np.zeros(len(warmup_vor.regions), dtype=np.int32)
        
        for i, region in enumerate(warmup_vor.regions):
            sizes[i] = len(region)
            for j, vi in enumerate(region):
                regions[i, j] = vi
        
        _ = _compute_voronoi_centroids(
            warmup_vor.vertices, regions, sizes, 
            warmup_vor.point_region, warmup_points, 10.0, 10.0
        )
    
    _warmup_numba()
    
except ImportError:
    NUMBA_AVAILABLE = False

# Incremental cache for Voronoi layouts with LRU eviction
from collections import OrderedDict

_voronoi_cache = OrderedDict()
_CACHE_MAX_CONFIGS = 100  # Maximum number of configurations to cache

def get_cache_key(rows, cols, spacing, hole_probability, seed):
    """Create cache key with rounded floats for consistency"""
    spacing = round(float(spacing), 6)
    hole_probability = round(float(hole_probability), 3)
    return f"{rows}_{cols}_{spacing}_{hole_probability}_{seed}"

def _evict_oldest_if_needed():
    """Evict oldest cache entry if we exceed the limit"""
    if len(_voronoi_cache) > _CACHE_MAX_CONFIGS:
        _voronoi_cache.popitem(last=False)  # Remove oldest (FIFO)

def _apply_lloyd_iterations(points, width, height, iterations, cache_intermediates=None, start_iteration=0):
    """
    Apply Lloyd's relaxation for specified number of iterations
    
    Args:
        points: Starting point positions
        width: Domain width
        height: Domain height
        iterations: Number of iterations to perform
        cache_intermediates: Dict to store intermediate results (optional)
        start_iteration: Starting iteration number (for cache keys)
    """
    if iterations == 0:
        return points
    
    if NUMBA_AVAILABLE:
        for i in range(iterations):
            vor = Voronoi(points)
            
            max_region_size = max(len(r) for r in vor.regions)
            n_regions = len(vor.regions)
            regions_array = np.full((n_regions, max_region_size), -1, dtype=np.int32)
            region_sizes = np.zeros(n_regions, dtype=np.int32)
            
            for j, region in enumerate(vor.regions):
                region_sizes[j] = len(region)
                for k, vi in enumerate(region):
                    regions_array[j, k] = vi
            
            points = _compute_voronoi_centroids(
                vor.vertices, regions_array, region_sizes,
                vor.point_region, points, width, height
            )
            
            # Cache intermediate result if requested
            if cache_intermediates is not None:
                iteration_num = start_iteration + i + 1
                cache_intermediates[iteration_num] = points.copy()
    else:
        for i in range(iterations):
            vor = Voronoi(points)
            new_points = []
            
            for idx, region in enumerate(vor.point_region):
                region_indices = vor.regions[region]
                if -1 not in region_indices and len(region_indices) > 0:
                    vertices = vor.vertices[region_indices]
                    centroid = vertices.mean(axis=0)
                    centroid[0] = np.clip(centroid[0], 0, width)
                    centroid[1] = np.clip(centroid[1], 0, height)
                    new_points.append(centroid)
                else:
                    new_points.append(points[idx])
            
            points = np.array(new_points)
            
            # Cache intermediate result if requested
            if cache_intermediates is not None:
                iteration_num = start_iteration + i + 1
                cache_intermediates[iteration_num] = points.copy()
    
    return points

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
    Generate Voronoi tessellation-based layout with incremental caching
    
    Args:
        rows: number of rows (controls density)
        cols: number of columns (controls density)
        hole_probability: probability that a cell becomes a hole
        spacing: approximate spacing between points
        lloyd_iterations: number of Lloyd's relaxation iterations
        seed: random seed for reproducibility
    
    Returns:
        List of (x, y, is_pillar) tuples
    """
    if seed is not None:
        np.random.seed(seed)
    
    width = cols * spacing
    height = rows * spacing * np.sqrt(3) / 2
    n_points = rows * cols
    
    cache_key = get_cache_key(rows, cols, spacing, hole_probability, seed)
    
    # Move this config to end (most recently used) if it exists
    if cache_key in _voronoi_cache:
        _voronoi_cache.move_to_end(cache_key)
    else:
        # Initialize new cache entry
        _voronoi_cache[cache_key] = {}
        _evict_oldest_if_needed()
    
    iteration_cache = _voronoi_cache[cache_key]
    
    # Check if we have this exact iteration count cached
    if lloyd_iterations in iteration_cache:
        points = iteration_cache[lloyd_iterations]
    else:
        # Find the highest cached iteration below our target
        cached_iterations = [k for k in iteration_cache.keys() if k < lloyd_iterations]
        
        if cached_iterations:
            # Start from highest cached iteration
            start_iteration = max(cached_iterations)
            points = iteration_cache[start_iteration].copy()
            remaining_iterations = lloyd_iterations - start_iteration
            
            # Apply remaining iterations and cache all intermediate steps
            points = _apply_lloyd_iterations(
                points, width, height, remaining_iterations, 
                cache_intermediates=iteration_cache,
                start_iteration=start_iteration
            )
        else:
            # No cached data - start from scratch
            if 0 in iteration_cache:
                points = iteration_cache[0].copy()
            else:
                # Generate initial random points
                points = np.random.rand(n_points, 2)
                points[:, 0] *= width
                points[:, 1] *= height
                # Cache the initial state
                iteration_cache[0] = points.copy()
            
            # Apply all iterations and cache all intermediate steps
            points = _apply_lloyd_iterations(
                points, width, height, lloyd_iterations,
                cache_intermediates=iteration_cache,
                start_iteration=0
            )
        
        # Ensure final iteration is cached (in case iterations was 0)
        if lloyd_iterations not in iteration_cache:
            iteration_cache[lloyd_iterations] = points.copy()
    
    # Convert to layout format with pillar/hole designation
    layout = []
    for x, y in points:
        is_pillar = np.random.rand() > hole_probability
        layout.append((float(x), float(y), is_pillar))
    
    return layout

def clear_voronoi_cache():
    """Clear the Voronoi layout cache"""
    global _voronoi_cache
    _voronoi_cache = {}

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